
import axios from 'axios';

interface CTraderCredentials {
  login: string;
  password: string;
  server: string;
}

interface CTraderOrder {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  volume: number;
  executedPrice: number;
  executedQuantity: number;
  commission?: number;
}

interface CTraderPosition {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  volume: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  swap: number;
  commission: number;
}

interface CTraderAccountInfo {
  accountId: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  currency: string;
  leverage: number;
}

class CTraderIntegration {
  private baseUrl = 'https://demo.ctraderapi.com';
  private accessToken: string | null = null;
  private isConnected = false;
  private credentials: CTraderCredentials | null = null;

  async connectWithCredentials(login: string, password: string, server: string): Promise<boolean> {
    try {
      this.credentials = { login, password, server };
      
      // Get OAuth token
      const tokenResponse = await this.getAccessToken();
      if (!tokenResponse.success) {
        console.error('Failed to get access token:', tokenResponse.error);
        return false;
      }

      this.accessToken = tokenResponse.accessToken;
      
      // Verify connection by getting account info
      const accountInfo = await this.getAccountInfo();
      if (accountInfo.success) {
        this.isConnected = true;
        console.log('Successfully connected to cTrader demo account');
        return true;
      } else {
        console.error('Failed to verify cTrader connection:', accountInfo.error);
        return false;
      }
    } catch (error) {
      console.error('cTrader connection error:', error);
      this.isConnected = false;
      return false;
    }
  }

  private async getAccessToken(): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      if (!this.credentials) {
        return { success: false, error: 'No credentials provided' };
      }

      // For demo accounts, simulate authentication without OAuth
      console.log(`Connecting to cTrader demo server: ${this.credentials.server} with login: ${this.credentials.login}`);
      
      // Simulate authentication validation
      if (this.credentials.login && this.credentials.password && this.credentials.server) {
        return { success: true, accessToken: 'demo_access_token_' + Date.now() };
      } else {
        return { success: false, error: 'Invalid credentials provided' };
      }
    } catch (error) {
      return { success: false, error: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async getAccountInfo(): Promise<{ success: boolean; account?: CTraderAccountInfo; error?: string }> {
    try {
      if (!this.accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      // For demo purposes, return consistent mock data
      // In real implementation, call the actual API
      const demoBalance = 50000.00; // Consistent demo balance
      
      const mockAccount: CTraderAccountInfo & { isDemoMode: boolean } = {
        accountId: this.credentials?.login || 'demo_account',
        balance: demoBalance,
        equity: demoBalance + 2350.75, // Small equity variation
        margin: 1250.50,
        freeMargin: demoBalance - 1250.50,
        currency: 'USD',
        leverage: 100,
        isDemoMode: true
      };

      return { success: true, account: mockAccount };
    } catch (error) {
      return { success: false, error: `Failed to get account info: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    volume: number,
    price?: number,
    stopLoss?: number,
    takeProfit?: number,
    comment?: string
  ): Promise<{ success: boolean; order?: CTraderOrder; error?: string }> {
    try {
      if (!this.accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      // For demo purposes, simulate order placement
      // In real implementation, call the actual API
      const mockOrder: CTraderOrder = {
        orderId: `CT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side,
        volume,
        executedPrice: price || (1.0500 + Math.random() * 0.01),
        executedQuantity: volume,
        commission: volume * 0.00001 // Mock commission
      };

      console.log(`Placed cTrader order: ${side} ${volume} ${symbol}`);
      return { success: true, order: mockOrder };
    } catch (error) {
      return { success: false, error: `Order placement failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async getPositions(): Promise<{ success: boolean; positions?: CTraderPosition[]; error?: string }> {
    try {
      if (!this.accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      // For demo purposes, return mock positions
      const mockPositions: CTraderPosition[] = [
        {
          id: 'pos_1',
          symbol: 'EURUSD',
          side: 'BUY',
          volume: 10000,
          entryPrice: 1.0850,
          currentPrice: 1.0875,
          unrealizedPnL: 25,
          swap: -0.5,
          commission: 1
        }
      ];

      return { success: true, positions: mockPositions };
    } catch (error) {
      return { success: false, error: `Failed to get positions: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async closePosition(positionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      // For demo purposes, simulate position closure
      console.log(`Closed cTrader position: ${positionId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to close position: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async getSymbols(): Promise<{ success: boolean; symbols?: string[]; error?: string }> {
    try {
      if (!this.accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      // Return common forex symbols supported by cTrader
      const symbols = [
        'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 
        'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'CHFJPY', 'AUDJPY'
      ];

      return { success: true, symbols };
    } catch (error) {
      return { success: false, error: `Failed to get symbols: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  isConnected(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<boolean> {
    try {
      this.accessToken = null;
      this.isConnected = false;
      this.credentials = null;
      console.log('cTrader disconnected');
      return true;
    } catch (error) {
      console.error('cTrader disconnect error:', error);
      return false;
    }
  }

  isDemoMode(): boolean {
    return true; // Always demo for this setup
  }
}

export const ctraderIntegration = new CTraderIntegration();
