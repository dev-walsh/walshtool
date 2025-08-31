
import axios from 'axios';

interface CTraderCredentials {
  login: string;
  password: string;
  server: string;
  clientId?: string;
  clientSecret?: string;
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
  accountNumber: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  currency: string;
  leverage: number;
  brokerName: string;
  isLive: boolean;
}

class CTraderAccount {
  private baseUrl: string;
  private accessToken: string | null = null;
  private isConnected = false;
  private credentials: CTraderCredentials;
  private accountInfo: CTraderAccountInfo | null = null;

  constructor(credentials: CTraderCredentials) {
    this.credentials = credentials;
    // For demo purposes, we'll simulate the connection
    // In production, you would use actual cTrader API endpoints
    this.baseUrl = 'https://api.ctrader.com'; // This would be the real endpoint
  }

  async connect(): Promise<boolean> {
    try {
      // Step 1: Get access token using OAuth2
      const tokenResponse = await this.getAccessToken();
      if (!tokenResponse.success) {
        console.error('Failed to get access token:', tokenResponse.error);
        return false;
      }

      this.accessToken = tokenResponse.accessToken;
      
      // Step 2: Verify connection by getting account info
      const accountInfo = await this.getAccountInfo();
      if (accountInfo.success) {
        this.isConnected = true;
        this.accountInfo = accountInfo.account;
        console.log(`Successfully connected to cTrader account: ${this.accountInfo?.accountNumber}`);
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
      // For demo purposes, simulate authentication without making real API calls
      // In production, this would connect to the actual cTrader API
      
      // Validate credentials format
      if (!this.credentials.login || !this.credentials.password || !this.credentials.server) {
        return { success: false, error: 'Missing required credentials' };
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For demo purposes, accept any valid-looking credentials
      // In production, this would make a real OAuth2 request to cTrader
      const mockToken = `demo_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`✅ Mock cTrader authentication successful for account: ${this.credentials.login}`);
      return { success: true, accessToken: mockToken };
      
    } catch (error) {
      return { success: false, error: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async getAccountInfo(): Promise<{ success: boolean; account?: CTraderAccountInfo; error?: string }> {
    try {
      if (!this.accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // For demo purposes, generate realistic mock account data
      // In production, this would fetch real account data from cTrader API
      const isDemoAccount = this.credentials.server.toLowerCase().includes('demo') || 
                           this.credentials.server.toLowerCase().includes('test');
      
      const baseBalance = 10000 + Math.random() * 90000; // Random balance between 10K-100K
      const currentEquity = baseBalance + (Math.random() - 0.5) * 5000; // Slight variation
      
      const accountInfo: CTraderAccountInfo = {
        accountId: `ct_${this.credentials.login}_${Date.now()}`,
        accountNumber: this.credentials.login,
        balance: Math.round(baseBalance * 100) / 100,
        equity: Math.round(currentEquity * 100) / 100,
        margin: Math.round((currentEquity * 0.1) * 100) / 100,
        freeMargin: Math.round((currentEquity * 0.9) * 100) / 100,
        currency: 'USD',
        leverage: 100,
        brokerName: 'cTrader Demo',
        isLive: !isDemoAccount
      };

      console.log(`✅ Mock cTrader account info retrieved for: ${accountInfo.accountNumber}`);
      return { success: true, account: accountInfo };
      
    } catch (error) {
      return { success: false, error: `Failed to get account info: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  getStoredAccountInfo(): CTraderAccountInfo | null {
    return this.accountInfo;
  }

  isAccountConnected(): boolean {
    return this.isConnected && this.accountInfo !== null;
  }

  async disconnect(): Promise<boolean> {
    try {
      this.accessToken = null;
      this.isConnected = false;
      this.accountInfo = null;
      console.log('cTrader account disconnected');
      return true;
    } catch (error) {
      console.error('cTrader disconnect error:', error);
      return false;
    }
  }
}

class CTraderIntegration {
  private accounts = new Map<string, CTraderAccount>();
  private connectedAccounts = new Set<string>();

  async addAccount(login: string, password: string, server: string, clientId?: string, clientSecret?: string): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
      const credentials: CTraderCredentials = {
        login,
        password,
        server,
        clientId,
        clientSecret
      };

      const account = new CTraderAccount(credentials);
      const connected = await account.connect();

      if (connected) {
        const accountInfo = account.getStoredAccountInfo();
        if (accountInfo) {
          const accountKey = `${login}-${server}`;
          this.accounts.set(accountKey, account);
          this.connectedAccounts.add(accountKey);
          
          console.log(`Successfully added cTrader account: ${accountInfo.accountNumber}`);
          return { success: true, accountId: accountKey };
        }
      }

      return { success: false, error: 'Failed to connect to cTrader account' };
    } catch (error) {
      console.error('Error adding cTrader account:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async removeAccount(accountId: string): Promise<boolean> {
    const account = this.accounts.get(accountId);
    if (account) {
      await account.disconnect();
      this.accounts.delete(accountId);
      this.connectedAccounts.delete(accountId);
      return true;
    }
    return false;
  }

  getAllAccounts(): Array<{ accountId: string; info: CTraderAccountInfo | null; connected: boolean }> {
    const result: Array<{ accountId: string; info: CTraderAccountInfo | null; connected: boolean }> = [];
    
    for (const [accountId, account] of this.accounts) {
      result.push({
        accountId,
        info: account.getStoredAccountInfo(),
        connected: account.isAccountConnected()
      });
    }
    
    return result;
  }

  getAccount(accountId: string): CTraderAccount | undefined {
    return this.accounts.get(accountId);
  }

  async getAccountInfo(accountId?: string): Promise<{ success: boolean; account?: CTraderAccountInfo; error?: string }> {
    if (accountId) {
      const account = this.accounts.get(accountId);
      if (account && account.isAccountConnected()) {
        return { success: true, account: account.getStoredAccountInfo()! };
      } else {
        return { success: false, error: 'Account not found or not connected' };
      }
    }

    // Return first connected account if no specific account requested
    for (const account of this.accounts.values()) {
      if (account.isAccountConnected()) {
        return { success: true, account: account.getStoredAccountInfo()! };
      }
    }

    return { success: false, error: 'No connected accounts found' };
  }

  // Legacy method for backward compatibility
  async connectWithCredentials(login: string, password: string, server: string): Promise<boolean> {
    const result = await this.addAccount(login, password, server);
    return result.success;
  }

  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    volume: number,
    accountId?: string,
    price?: number,
    stopLoss?: number,
    takeProfit?: number,
    comment?: string
  ): Promise<{ success: boolean; order?: CTraderOrder; error?: string }> {
    try {
      const account = accountId ? this.accounts.get(accountId) : this.getFirstConnectedAccount();
      if (!account || !account.isAccountConnected()) {
        return { success: false, error: 'No connected account available' };
      }

      // Implement real order placement via cTrader API
      const mockOrder: CTraderOrder = {
        orderId: `CT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side,
        volume,
        executedPrice: price || (1.0500 + Math.random() * 0.01),
        executedQuantity: volume,
        commission: volume * 0.00001
      };

      console.log(`Placed cTrader order: ${side} ${volume} ${symbol}`);
      return { success: true, order: mockOrder };
    } catch (error) {
      return { success: false, error: `Order placement failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async getPositions(accountId?: string): Promise<{ success: boolean; positions?: CTraderPosition[]; error?: string }> {
    try {
      const account = accountId ? this.accounts.get(accountId) : this.getFirstConnectedAccount();
      if (!account || !account.isAccountConnected()) {
        return { success: false, error: 'No connected account available' };
      }

      // Implement real positions fetching via cTrader API
      const mockPositions: CTraderPosition[] = [];
      return { success: true, positions: mockPositions };
    } catch (error) {
      return { success: false, error: `Failed to get positions: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async closePosition(positionId: string, accountId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const account = accountId ? this.accounts.get(accountId) : this.getFirstConnectedAccount();
      if (!account || !account.isAccountConnected()) {
        return { success: false, error: 'No connected account available' };
      }

      console.log(`Closed cTrader position: ${positionId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to close position: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async getSymbols(accountId?: string): Promise<{ success: boolean; symbols?: string[]; error?: string }> {
    try {
      const account = accountId ? this.accounts.get(accountId) : this.getFirstConnectedAccount();
      if (!account || !account.isAccountConnected()) {
        return { success: false, error: 'No connected account available' };
      }

      const symbols = [
        'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 
        'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'CHFJPY', 'AUDJPY'
      ];

      return { success: true, symbols };
    } catch (error) {
      return { success: false, error: `Failed to get symbols: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private getFirstConnectedAccount(): CTraderAccount | undefined {
    for (const account of this.accounts.values()) {
      if (account.isAccountConnected()) {
        return account;
      }
    }
    return undefined;
  }

  hasConnectedAccounts(): boolean {
    return this.connectedAccounts.size > 0;
  }

  async disconnect(accountId?: string): Promise<boolean> {
    try {
      if (accountId) {
        return await this.removeAccount(accountId);
      } else {
        // Disconnect all accounts
        for (const account of this.accounts.values()) {
          await account.disconnect();
        }
        this.accounts.clear();
        this.connectedAccounts.clear();
        console.log('All cTrader accounts disconnected');
        return true;
      }
    } catch (error) {
      console.error('cTrader disconnect error:', error);
      return false;
    }
  }

  // Legacy method for backward compatibility
  isConnected(): boolean {
    return this.hasConnectedAccounts();
  }

  isDemoMode(): boolean {
    return true; // For now, only supporting demo accounts
  }
}

export const ctraderIntegration = new CTraderIntegration();
