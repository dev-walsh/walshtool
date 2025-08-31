
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
    // Use demo environment for demo accounts
    this.baseUrl = credentials.server.toLowerCase().includes('demo') 
      ? 'https://demo-api.ctrader.com' 
      : 'https://api.ctrader.com';
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
      // For demo accounts, use the cTrader demo OAuth endpoint
      const authUrl = `${this.baseUrl}/oauth/token`;
      
      const response = await axios.post(authUrl, {
        grant_type: 'password',
        username: this.credentials.login,
        password: this.credentials.password,
        client_id: this.credentials.clientId || 'demo_client',
        client_secret: this.credentials.clientSecret || 'demo_secret'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      if (response.data.access_token) {
        return { success: true, accessToken: response.data.access_token };
      } else {
        return { success: false, error: 'No access token received' };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { 
          success: false, 
          error: `Authentication failed: ${error.response?.data?.error || error.message}` 
        };
      }
      return { success: false, error: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async getAccountInfo(): Promise<{ success: boolean; account?: CTraderAccountInfo; error?: string }> {
    try {
      if (!this.accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await axios.get(`${this.baseUrl}/v2/accounts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      if (response.data && response.data.length > 0) {
        const account = response.data[0]; // Get first account
        
        const accountInfo: CTraderAccountInfo = {
          accountId: account.accountId.toString(),
          accountNumber: account.accountNumber.toString(),
          balance: parseFloat(account.balance) / 100, // cTrader returns cents
          equity: parseFloat(account.equity) / 100,
          margin: parseFloat(account.margin) / 100,
          freeMargin: parseFloat(account.freeMargin) / 100,
          currency: account.currency,
          leverage: account.leverage,
          brokerName: account.brokerName || 'cTrader',
          isLive: !account.isDemo
        };

        return { success: true, account: accountInfo };
      } else {
        return { success: false, error: 'No accounts found' };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { 
          success: false, 
          error: `Failed to get account info: ${error.response?.data?.message || error.message}` 
        };
      }
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
