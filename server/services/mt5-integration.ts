
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import WebSocket from 'ws';

interface MT5MarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  time: number;
}

interface MT5Position {
  ticket: number;
  symbol: string;
  type: number; // 0=buy, 1=sell
  volume: number;
  price_open: number;
  price_current: number;
  profit: number;
  swap: number;
  commission: number;
}

interface MT5Order {
  ticket: number;
  symbol: string;
  type: number;
  volume: number;
  price: number;
  sl: number;
  tp: number;
  comment: string;
}

interface RemoteConfig {
  host: string;
  port: number;
  enabled: boolean;
}

class MT5Integration {
  private pythonPath = 'python';
  private isConnected = false;
  private isDemoAccount = true;
  private pythonAvailable = false;
  private remoteConfig: RemoteConfig | null = null;
  private ws: WebSocket | null = null;
  private connectionPromise: Promise<any> | null = null;

  async initialize(): Promise<boolean> {
    try {
      // Check for remote configuration first
      const remoteConfigPath = join(process.cwd(), 'mt5-remote-config.json');
      if (existsSync(remoteConfigPath)) {
        const configData = readFileSync(remoteConfigPath, 'utf8');
        this.remoteConfig = JSON.parse(configData);
        
        if (this.remoteConfig?.enabled) {
          console.log(`Attempting to connect to remote MT5 at ${this.remoteConfig.host}:${this.remoteConfig.port}`);
          return await this.connectRemote();
        }
      }

      // Fallback to local Python if no remote config
      this.pythonAvailable = await this.checkPythonAvailability();
      if (!this.pythonAvailable) {
        console.error('Python3 is not available and no remote MT5 configured. Please set up remote MT5 connection or install Python3 with MetaTrader5 package.');
        return false;
      }

      // Create Python script for MT5 operations
      this.createMT5PythonScript();
      
      // Test connection
      const result = await this.executePythonCommand('test_connection');
      this.isConnected = result.success;
      
      console.log(`MT5 Integration ${this.isConnected ? 'connected' : 'failed to connect'}`);
      return this.isConnected;
    } catch (error) {
      console.error('MT5 initialization error:', error);
      return false;
    }
  }

  private async connectRemote(retryCount = 0): Promise<boolean> {
    if (!this.remoteConfig) return false;

    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds between retries
    const connectionTimeout = 15000; // 15 seconds timeout

    return new Promise((resolve) => {
      try {
        const wsUrl = `ws://${this.remoteConfig!.host}:${this.remoteConfig!.port}`;
        console.log(`Attempting to connect to remote MT5 at ${wsUrl} (attempt ${retryCount + 1}/${maxRetries + 1})`);
        
        this.ws = new WebSocket(wsUrl, {
          handshakeTimeout: connectionTimeout,
          perMessageDeflate: false
        });

        let connectionResolved = false;

        const resolveConnection = (success: boolean) => {
          if (connectionResolved) return;
          connectionResolved = true;
          resolve(success);
        };

        this.ws.on('open', () => {
          console.log('Successfully connected to remote MT5 server');
          this.isConnected = true;
          resolveConnection(true);
        });

        this.ws.on('error', (error) => {
          console.error(`Remote MT5 connection error (attempt ${retryCount + 1}):`, error.message);
          this.isConnected = false;
          
          if (!connectionResolved) {
            if (retryCount < maxRetries) {
              console.log(`Retrying connection in ${retryDelay}ms...`);
              setTimeout(async () => {
                const retryResult = await this.connectRemote(retryCount + 1);
                resolveConnection(retryResult);
              }, retryDelay);
            } else {
              console.error('All connection attempts failed');
              resolveConnection(false);
            }
          }
        });

        this.ws.on('close', (code, reason) => {
          console.log(`Remote MT5 connection closed (code: ${code}, reason: ${reason})`);
          this.isConnected = false;
          
          if (!connectionResolved) {
            if (retryCount < maxRetries) {
              console.log(`Connection closed, retrying in ${retryDelay}ms...`);
              setTimeout(async () => {
                const retryResult = await this.connectRemote(retryCount + 1);
                resolveConnection(retryResult);
              }, retryDelay);
            } else {
              resolveConnection(false);
            }
          }
        });

        // Timeout after specified duration
        setTimeout(() => {
          if (!connectionResolved) {
            console.error(`Connection timeout after ${connectionTimeout}ms`);
            this.ws?.close();
            
            if (retryCount < maxRetries) {
              console.log(`Timeout occurred, retrying in ${retryDelay}ms...`);
              setTimeout(async () => {
                const retryResult = await this.connectRemote(retryCount + 1);
                resolveConnection(retryResult);
              }, retryDelay);
            } else {
              resolveConnection(false);
            }
          }
        }, connectionTimeout);

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        if (retryCount < maxRetries) {
          setTimeout(async () => {
            const retryResult = await this.connectRemote(retryCount + 1);
            resolve(retryResult);
          }, retryDelay);
        } else {
          resolve(false);
        }
      }
    });
  }

  private async sendRemoteCommand(command: string, ...args: any[]): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Try to reconnect if connection is lost
      if (this.remoteConfig?.enabled) {
        console.log('Connection lost, attempting to reconnect...');
        const reconnected = await this.connectRemote();
        if (!reconnected) {
          throw new Error('Remote MT5 connection not available and reconnection failed');
        }
      } else {
        throw new Error('Remote MT5 connection not available');
      }
    }

    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      const message = {
        id: requestId,
        command,
        args
      };

      const timeout = setTimeout(() => {
        this.ws?.off('message', handleMessage);
        reject(new Error(`Remote command timeout for ${command}`));
      }, 30000);

      const handleMessage = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === requestId) {
            clearTimeout(timeout);
            this.ws?.off('message', handleMessage);
            
            if (response.success === false) {
              reject(new Error(response.error || 'Remote command failed'));
            } else {
              resolve(response.result || response);
            }
          }
        } catch (error) {
          // Ignore parse errors for other messages
        }
      };

      this.ws.on('message', handleMessage);
      
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeout);
        this.ws?.off('message', handleMessage);
        reject(new Error(`Failed to send command: ${error.message}`));
      }
    });
  }

  async configureRemoteConnection(host: string, port: number): Promise<boolean> {
    const config: RemoteConfig = {
      host,
      port,
      enabled: true
    };

    // Save configuration
    const configPath = join(process.cwd(), 'mt5-remote-config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    this.remoteConfig = config;

    // Test connection with validation
    console.log(`Testing connection to ${host}:${port}...`);
    const connected = await this.connectRemote();
    
    if (connected) {
      console.log(`Remote MT5 connection configured successfully for ${host}:${port}`);
      // Test a simple command to verify the connection works
      try {
        await this.sendRemoteCommand('test_connection');
        console.log('Remote MT5 bridge server is responding correctly');
      } catch (error) {
        console.warn('Connection established but bridge server may not be functioning properly:', error.message);
      }
    } else {
      console.error(`Failed to connect to remote MT5 at ${host}:${port}`);
      console.error('Please ensure:');
      console.error('1. MT5 Bridge Server is running on the remote machine');
      console.error('2. Port forwarding is configured correctly');
      console.error('3. Firewall allows connections on the specified port');
      console.error('4. The host address and port are correct');
    }

    return connected;
  }

  private async checkPythonAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const pythonProcess = spawn(this.pythonPath, ['--version']);
      
      pythonProcess.on('close', (code) => {
        resolve(code === 0);
      });

      pythonProcess.on('error', (error) => {
        console.error('Python check failed:', error.message);
        resolve(false);
      });
    });
  }

  async connectWithCredentials(login: string, password: string, server: string): Promise<boolean> {
    try {
      // Use remote connection if available
      if (this.remoteConfig?.enabled && this.ws) {
        const result = await this.sendRemoteCommand('connect_with_credentials', login, password, server);
        this.isConnected = result.success;
        console.log(`Remote MT5 Integration ${this.isConnected ? 'connected' : 'failed to connect'} to server: ${server}`);
        return this.isConnected;
      }

      // Fallback to local Python
      if (!this.pythonAvailable) {
        this.pythonAvailable = await this.checkPythonAvailability();
        if (!this.pythonAvailable) {
          throw new Error('Python3 is not available. Please ensure Python3 and MetaTrader5 package are installed.');
        }
      }

      this.createMT5PythonScript();
      const result = await this.executePythonCommand('connect_with_credentials', login, password, server);
      this.isConnected = result.success;
      
      console.log(`MT5 Integration ${this.isConnected ? 'connected' : 'failed to connect'} to server: ${server}`);
      return this.isConnected;
    } catch (error) {
      console.error('MT5 connection error:', error);
      this.isConnected = false;
      return false;
    }
  }

  private createMT5PythonScript(): void {
    const pythonScript = `
import MetaTrader5 as mt5
import json
import sys
import pandas as pd
from datetime import datetime, timedelta

def connect_mt5():
    """Initialize connection to MT5"""
    if not mt5.initialize():
        return {"success": False, "error": f"initialize() failed, error code = {mt5.last_error()}"}
    
    # Check if demo account
    account_info = mt5.account_info()
    if account_info is None:
        return {"success": False, "error": "Failed to get account info"}
    
    return {
        "success": True,
        "account": {
            "login": account_info.login,
            "balance": account_info.balance,
            "equity": account_info.equity,
            "margin": account_info.margin,
            "server": account_info.server,
            "leverage": account_info.leverage,
            "currency": account_info.currency
        }
    }

def connect_with_credentials(login, password, server):
    """Connect to MT5 with specific credentials"""
    # Shutdown any existing connection
    mt5.shutdown()
    
    # Initialize MT5
    if not mt5.initialize():
        return {"success": False, "error": f"initialize() failed, error code = {mt5.last_error()}"}
    
    # Login with credentials
    login_result = mt5.login(int(login), password, server)
    if not login_result:
        error_code = mt5.last_error()
        mt5.shutdown()
        return {"success": False, "error": f"Login failed, error code = {error_code}"}
    
    # Get account info to verify connection
    account_info = mt5.account_info()
    if account_info is None:
        mt5.shutdown()
        return {"success": False, "error": "Failed to get account info after login"}
    
    return {
        "success": True,
        "account": {
            "login": account_info.login,
            "balance": account_info.balance,
            "equity": account_info.equity,
            "margin": account_info.margin,
            "server": account_info.server,
            "leverage": account_info.leverage,
            "currency": account_info.currency
        }
    }

def get_symbols():
    """Get available trading symbols"""
    symbols = mt5.symbols_get()
    if symbols is None:
        return {"success": False, "error": "No symbols found"}
    
    symbol_list = []
    for symbol in symbols:
        if symbol.visible and 'USD' in symbol.name:  # Focus on USD pairs
            symbol_list.append({
                "name": symbol.name,
                "description": symbol.description,
                "spread": symbol.spread,
                "volume_min": symbol.volume_min,
                "volume_max": symbol.volume_max
            })
    
    return {"success": True, "symbols": symbol_list}

def get_market_data(symbol, timeframe="M1", count=100):
    """Get market data for a symbol"""
    try:
        # Convert timeframe string to MT5 constant
        tf_map = {
            "M1": mt5.TIMEFRAME_M1,
            "M5": mt5.TIMEFRAME_M5,
            "M15": mt5.TIMEFRAME_M15,
            "H1": mt5.TIMEFRAME_H1,
            "H4": mt5.TIMEFRAME_H4,
            "D1": mt5.TIMEFRAME_D1
        }
        
        timeframe_mt5 = tf_map.get(timeframe, mt5.TIMEFRAME_M1)
        
        # Get rates
        rates = mt5.copy_rates_from_pos(symbol, timeframe_mt5, 0, count)
        if rates is None:
            return {"success": False, "error": f"Failed to get rates for {symbol}"}
        
        # Convert to list of dictionaries
        rates_list = []
        for rate in rates:
            rates_list.append({
                "time": int(rate['time']),
                "open": float(rate['open']),
                "high": float(rate['high']),
                "low": float(rate['low']),
                "close": float(rate['close']),
                "tick_volume": int(rate['tick_volume']),
                "spread": int(rate['spread'])
            })
        
        return {"success": True, "data": rates_list}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_tick_data(symbol):
    """Get latest tick data for a symbol"""
    try:
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            return {"success": False, "error": f"Failed to get tick for {symbol}"}
        
        return {
            "success": True,
            "tick": {
                "symbol": symbol,
                "bid": tick.bid,
                "ask": tick.ask,
                "last": tick.last,
                "volume": tick.volume,
                "time": tick.time
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def place_order(symbol, order_type, volume, price=0, sl=0, tp=0, comment=""):
    """Place a trading order"""
    try:
        # Prepare order request
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": volume,
            "type": order_type,
            "comment": comment,
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        # Add price for pending orders
        if price > 0:
            request["price"] = price
        
        # Add stop loss and take profit
        if sl > 0:
            request["sl"] = sl
        if tp > 0:
            request["tp"] = tp
        
        # Send order
        result = mt5.order_send(request)
        
        if result is None:
            return {"success": False, "error": "Order send failed"}
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return {"success": False, "error": f"Order failed: {result.comment}"}
        
        return {
            "success": True,
            "order": {
                "ticket": result.order,
                "volume": result.volume,
                "price": result.price,
                "comment": result.comment
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_positions():
    """Get open positions"""
    try:
        positions = mt5.positions_get()
        if positions is None:
            return {"success": True, "positions": []}
        
        position_list = []
        for pos in positions:
            position_list.append({
                "ticket": pos.ticket,
                "symbol": pos.symbol,
                "type": pos.type,
                "volume": pos.volume,
                "price_open": pos.price_open,
                "price_current": pos.price_current,
                "profit": pos.profit,
                "swap": pos.swap,
                "commission": pos.commission
            })
        
        return {"success": True, "positions": position_list}
    except Exception as e:
        return {"success": False, "error": str(e)}

def close_position(ticket):
    """Close a position by ticket"""
    try:
        positions = mt5.positions_get(ticket=ticket)
        if not positions:
            return {"success": False, "error": f"Position {ticket} not found"}
        
        position = positions[0]
        
        # Prepare close request
        close_request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": position.symbol,
            "volume": position.volume,
            "type": mt5.ORDER_TYPE_SELL if position.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY,
            "position": position.ticket,
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
            "comment": "Position closed by trading bot"
        }
        
        result = mt5.order_send(close_request)
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return {"success": False, "error": f"Close failed: {result.comment}"}
        
        return {"success": True, "closed_ticket": ticket}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No command provided"}))
        return
    
    command = sys.argv[1]
    
    # Connect to MT5
    connect_result = connect_mt5()
    if not connect_result["success"]:
        print(json.dumps(connect_result))
        return
    
    try:
        if command == "test_connection":
            print(json.dumps(connect_result))
        
        elif command == "connect_with_credentials":
            login = sys.argv[2]
            password = sys.argv[3]
            server = sys.argv[4]
            result = connect_with_credentials(login, password, server)
            print(json.dumps(result))
        
        elif command == "get_symbols":
            result = get_symbols()
            print(json.dumps(result))
        
        elif command == "get_market_data":
            symbol = sys.argv[2] if len(sys.argv) > 2 else "EURUSD"
            timeframe = sys.argv[3] if len(sys.argv) > 3 else "M1"
            count = int(sys.argv[4]) if len(sys.argv) > 4 else 100
            result = get_market_data(symbol, timeframe, count)
            print(json.dumps(result))
        
        elif command == "get_tick":
            symbol = sys.argv[2] if len(sys.argv) > 2 else "EURUSD"
            result = get_tick_data(symbol)
            print(json.dumps(result))
        
        elif command == "place_order":
            symbol = sys.argv[2]
            order_type = int(sys.argv[3])  # 0=buy, 1=sell
            volume = float(sys.argv[4])
            price = float(sys.argv[5]) if len(sys.argv) > 5 else 0
            sl = float(sys.argv[6]) if len(sys.argv) > 6 else 0
            tp = float(sys.argv[7]) if len(sys.argv) > 7 else 0
            comment = sys.argv[8] if len(sys.argv) > 8 else ""
            result = place_order(symbol, order_type, volume, price, sl, tp, comment)
            print(json.dumps(result))
        
        elif command == "get_positions":
            result = get_positions()
            print(json.dumps(result))
        
        elif command == "close_position":
            ticket = int(sys.argv[2])
            result = close_position(ticket)
            print(json.dumps(result))
        
        elif command == "shutdown":
            mt5.shutdown()
            print(json.dumps({"success": True, "message": "MT5 connection closed"}))
        
        else:
            print(json.dumps({"success": False, "error": f"Unknown command: {command}"}))
    
    finally:
        mt5.shutdown()

if __name__ == "__main__":
    main()
`;

    writeFileSync(join(process.cwd(), 'mt5_bridge.py'), pythonScript);
  }

  private async executePythonCommand(command: string, ...args: string[]): Promise<any> {
    // Use remote connection if available
    if (this.remoteConfig?.enabled && this.ws) {
      return await this.sendRemoteCommand(command, ...args);
    }

    // Fallback to local Python execution
    return new Promise((resolve) => {
      const pythonArgs = [join(process.cwd(), 'mt5_bridge.py'), command, ...args];
      const pythonProcess = spawn(this.pythonPath, pythonArgs);
      
      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          resolve({ success: false, error: error || `Process exited with code ${code}` });
          return;
        }

        try {
          const result = JSON.parse(output.trim());
          resolve(result);
        } catch (parseError) {
          resolve({ success: false, error: 'Failed to parse Python output', output });
        }
      });
    });
  }

  async getAccountInfo(): Promise<any> {
    return await this.executePythonCommand('test_connection');
  }

  async getSymbols(): Promise<any> {
    return await this.executePythonCommand('get_symbols');
  }

  async getMarketData(symbol: string, timeframe: string = 'M1', count: number = 100): Promise<any> {
    return await this.executePythonCommand('get_market_data', symbol, timeframe, count.toString());
  }

  async getTickData(symbol: string): Promise<any> {
    return await this.executePythonCommand('get_tick', symbol);
  }

  async placeOrder(
    symbol: string,
    orderType: 'BUY' | 'SELL',
    volume: number,
    price?: number,
    stopLoss?: number,
    takeProfit?: number,
    comment?: string
  ): Promise<any> {
    const type = orderType === 'BUY' ? '0' : '1';
    const args = [symbol, type, volume.toString()];
    
    if (price) args.push(price.toString());
    if (stopLoss) args.push(stopLoss.toString());
    if (takeProfit) args.push(takeProfit.toString());
    if (comment) args.push(comment);
    
    return await this.executePythonCommand('place_order', ...args);
  }

  async getPositions(): Promise<any> {
    return await this.executePythonCommand('get_positions');
  }

  async closePosition(ticket: number): Promise<any> {
    return await this.executePythonCommand('close_position', ticket.toString());
  }

  isConnected(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<boolean> {
    try {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      } else {
        await this.executePythonCommand('shutdown');
      }
      this.isConnected = false;
      console.log('MT5 disconnected');
      return true;
    } catch (error) {
      console.error('MT5 disconnect error:', error);
      return false;
    }
  }

  async loginUser(login: string, password: string, server: string): Promise<any> {
    try {
      const result = await this.connectWithCredentials(login, password, server);
      if (result) {
        const accountInfo = await this.executePythonCommand('test_connection');
        return {
          success: true,
          data: accountInfo.account
        };
      } else {
        return {
          success: false,
          error: 'Failed to connect with provided credentials'
        };
      }
    } catch (error) {
      console.error('MT5 login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  }

  isDemoMode(): boolean {
    return this.isDemoAccount;
  }

  getRemoteConfig(): RemoteConfig | null {
    return this.remoteConfig;
  }

  isUsingRemoteConnection(): boolean {
    return this.remoteConfig?.enabled === true && this.ws?.readyState === WebSocket.OPEN;
  }
}

export const mt5Integration = new MT5Integration();
