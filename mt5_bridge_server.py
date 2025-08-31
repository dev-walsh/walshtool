
#!/usr/bin/env python3
"""
MT5 Bridge Server - Run this on your Windows PC with MetaTrader5 installed
This creates a WebSocket server that allows remote access to your MT5 terminal
"""

import asyncio
import websockets
import json
import MetaTrader5 as mt5
import logging
from datetime import datetime
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MT5BridgeServer:
    def __init__(self, host='0.0.0.0', port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        
    async def handle_client(self, websocket, path):
        """Handle WebSocket client connections"""
        self.clients.add(websocket)
        client_address = websocket.remote_address
        logger.info(f"Client connected from {client_address}")
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    response = await self.process_command(data)
                    await websocket.send(json.dumps(response))
                except json.JSONDecodeError:
                    error_response = {
                        "id": None,
                        "success": False,
                        "error": "Invalid JSON format"
                    }
                    await websocket.send(json.dumps(error_response))
                except Exception as e:
                    error_response = {
                        "id": data.get("id") if 'data' in locals() else None,
                        "success": False,
                        "error": str(e)
                    }
                    await websocket.send(json.dumps(error_response))
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client {client_address} disconnected")
        finally:
            self.clients.remove(websocket)
    
    async def process_command(self, data):
        """Process MT5 commands"""
        command_id = data.get("id")
        command = data.get("command")
        args = data.get("args", [])
        
        logger.info(f"Processing command: {command} with args: {args}")
        
        try:
            if command == "test_connection":
                result = self.connect_mt5()
            elif command == "connect_with_credentials":
                result = self.connect_with_credentials(*args)
            elif command == "get_symbols":
                result = self.get_symbols()
            elif command == "get_market_data":
                result = self.get_market_data(*args)
            elif command == "get_tick":
                result = self.get_tick_data(*args)
            elif command == "place_order":
                result = self.place_order(*args)
            elif command == "get_positions":
                result = self.get_positions()
            elif command == "close_position":
                result = self.close_position(*args)
            elif command == "shutdown":
                result = self.shutdown_mt5()
            else:
                result = {"success": False, "error": f"Unknown command: {command}"}
                
            return {
                "id": command_id,
                "success": result.get("success", True),
                "result": result
            }
            
        except Exception as e:
            logger.error(f"Command {command} failed: {str(e)}")
            return {
                "id": command_id,
                "success": False,
                "error": str(e)
            }
    
    def connect_mt5(self):
        """Initialize connection to MT5"""
        if not mt5.initialize():
            return {"success": False, "error": f"initialize() failed, error code = {mt5.last_error()}"}
        
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
    
    def connect_with_credentials(self, login, password, server):
        """Connect to MT5 with specific credentials"""
        mt5.shutdown()
        
        if not mt5.initialize():
            return {"success": False, "error": f"initialize() failed, error code = {mt5.last_error()}"}
        
        login_result = mt5.login(int(login), password, server)
        if not login_result:
            error_code = mt5.last_error()
            mt5.shutdown()
            return {"success": False, "error": f"Login failed, error code = {error_code}"}
        
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
    
    def get_symbols(self):
        """Get available trading symbols"""
        symbols = mt5.symbols_get()
        if symbols is None:
            return {"success": False, "error": "No symbols found"}
        
        symbol_list = []
        for symbol in symbols:
            if symbol.visible and 'USD' in symbol.name:
                symbol_list.append({
                    "name": symbol.name,
                    "description": symbol.description,
                    "spread": symbol.spread,
                    "volume_min": symbol.volume_min,
                    "volume_max": symbol.volume_max
                })
        
        return {"success": True, "symbols": symbol_list}
    
    def get_market_data(self, symbol, timeframe="M1", count=100):
        """Get market data for a symbol"""
        try:
            tf_map = {
                "M1": mt5.TIMEFRAME_M1,
                "M5": mt5.TIMEFRAME_M5,
                "M15": mt5.TIMEFRAME_M15,
                "H1": mt5.TIMEFRAME_H1,
                "H4": mt5.TIMEFRAME_H4,
                "D1": mt5.TIMEFRAME_D1
            }
            
            timeframe_mt5 = tf_map.get(timeframe, mt5.TIMEFRAME_M1)
            rates = mt5.copy_rates_from_pos(symbol, timeframe_mt5, 0, int(count))
            
            if rates is None:
                return {"success": False, "error": f"Failed to get rates for {symbol}"}
            
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
    
    def get_tick_data(self, symbol):
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
    
    def place_order(self, symbol, order_type, volume, price=0, sl=0, tp=0, comment=""):
        """Place a trading order"""
        try:
            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol,
                "volume": float(volume),
                "type": int(order_type),
                "comment": comment,
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_IOC,
            }
            
            if float(price) > 0:
                request["price"] = float(price)
            if float(sl) > 0:
                request["sl"] = float(sl)
            if float(tp) > 0:
                request["tp"] = float(tp)
            
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
    
    def get_positions(self):
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
    
    def close_position(self, ticket):
        """Close a position by ticket"""
        try:
            positions = mt5.positions_get(ticket=int(ticket))
            if not positions:
                return {"success": False, "error": f"Position {ticket} not found"}
            
            position = positions[0]
            
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
            
            return {"success": True, "closed_ticket": int(ticket)}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def shutdown_mt5(self):
        """Shutdown MT5 connection"""
        mt5.shutdown()
        return {"success": True, "message": "MT5 connection closed"}
    
    async def start_server(self):
        """Start the WebSocket server"""
        logger.info(f"Starting MT5 Bridge Server on {self.host}:{self.port}")
        
        # Initialize MT5 connection
        init_result = self.connect_mt5()
        if init_result["success"]:
            logger.info("MT5 connection initialized successfully")
        else:
            logger.warning(f"MT5 initialization failed: {init_result['error']}")
        
        # Start WebSocket server
        async with websockets.serve(self.handle_client, self.host, self.port):
            logger.info(f"MT5 Bridge Server running on ws://{self.host}:{self.port}")
            logger.info("Waiting for client connections...")
            await asyncio.Future()  # Run forever

def main():
    parser = argparse.ArgumentParser(description='MT5 Bridge Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8765, help='Port to bind to (default: 8765)')
    
    args = parser.parse_args()
    
    # Check if MT5 is available
    if not mt5.initialize():
        logger.error("MetaTrader5 is not available. Please ensure MT5 is installed and running.")
        return
    
    mt5.shutdown()  # Close initial test connection
    
    server = MT5BridgeServer(args.host, args.port)
    
    try:
        asyncio.run(server.start_server())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")

if __name__ == "__main__":
    main()
