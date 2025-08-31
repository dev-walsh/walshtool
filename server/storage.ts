interface Account {
  id: string;
  userId: string; // Added for user association
  name: string;
  balance: string;
  equity: string;
  broker: string;
  status: string;
  createdAt: string;
}

interface Strategy {
  id: string;
  userId: string; // Added for user association
  name: string;
  status: string;
  isEnabled: boolean;
  symbols: string[];
  createdAt: string;
}

interface Position {
  id: string;
  accountId: string;
  strategyId?: string; // Optional, if associated with a strategy
  symbol: string;
  side: string;
  quantity: string;
  avgPrice: string;
  currentPrice: string;
  unrealizedPnL: string;
  realizedPnL?: string; // Added for completeness
  stopLoss?: string; // Added for completeness
  takeProfit?: string; // Added for completeness
  isOpen: boolean;
  createdAt: string;
  closedAt?: string; // Added for completeness
}

interface Order {
  id: string;
  accountId: string;
  symbol: string;
  side: string;
  quantity: string;
  price: string;
  status: string;
  createdAt: string;
}

interface Alert {
  id: string;
  level: string;
  title: string;
  message: string;
  source: string;
  isRead: boolean;
  createdAt: string;
  timestamp?: string; // Added for consistency with the change
}

interface Backtest {
  id: string;
  strategyId: string;
  name: string;
  startDate: string;
  endDate: string;
  parameters: { initialBalance: number; commission: number };
  status: string;
  metrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    avgTrade: number;
    avgWin?: number;
    avgLoss?: number;
    largestWin?: number;
    largestLoss?: number;
    consecutiveWins?: number;
    consecutiveLosses?: number;
    annualizedReturn?: number;
  } | null;
  createdAt: string;
  completedAt: string | null;
}

interface SystemStatus {
  service: string;
  status: string;
  latency: number;
  metadata: any;
  lastUpdate: string;
}

interface AuditTrail {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: any;
  ip: string;
}

type InsertBacktest = Omit<Backtest, 'id' | 'status' | 'createdAt' | 'completedAt' | 'metrics'>;

class MockStorage {
  private accounts: Account[] = [
    {
      id: "acc-1",
      userId: "user-1", // Added for user association
      name: "FTMO Challenge Account",
      balance: "100000.00",
      equity: "102450.75",
      broker: "OANDA",
      status: "ACTIVE",
      createdAt: new Date().toISOString()
    }
  ];

  private strategies: Strategy[] = [
    {
      id: "strat-1",
      userId: "user-1", // Added for user association
      name: "Breakout Strategy",
      status: "RUNNING",
      isEnabled: true,
      symbols: ["EURUSD", "GBPUSD"],
      createdAt: new Date().toISOString()
    },
    {
      id: "strat-2",
      userId: "user-1", // Added for user association
      name: "Mean Reversion",
      status: "STOPPED",
      isEnabled: false,
      symbols: ["USDJPY"],
      createdAt: new Date().toISOString()
    }
  ];

  private positions: Position[] = [
    {
      id: "pos-1",
      accountId: "acc-1",
      strategyId: "strat-1", // Assuming association
      symbol: "EURUSD",
      side: "BUY",
      quantity: "10000",
      avgPrice: "1.0850",
      currentPrice: "1.0865",
      unrealizedPnL: "150.00",
      isOpen: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "pos-2",
      accountId: "acc-1",
      strategyId: "strat-1", // Assuming association
      symbol: "GBPUSD",
      side: "SELL",
      quantity: "5000",
      avgPrice: "1.2650",
      currentPrice: "1.2635",
      unrealizedPnL: "75.00",
      isOpen: true,
      createdAt: new Date().toISOString()
    }
  ];

  private orders: Order[] = [
    {
      id: "order-1",
      accountId: "acc-1",
      symbol: "EURUSD",
      side: "BUY",
      quantity: "10000",
      price: "1.0850",
      status: "FILLED",
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "order-2",
      accountId: "acc-1",
      symbol: "GBPUSD",
      side: "SELL",
      quantity: "5000",
      price: "1.2650",
      status: "FILLED",
      createdAt: new Date(Date.now() - 1800000).toISOString()
    }
  ];

  private alerts: Alert[] = [
    {
      id: "alert-1",
      level: "WARNING",
      title: "High Drawdown Alert",
      message: "Account drawdown approaching 5% limit",
      source: "RISK_MANAGER",
      isRead: false,
      createdAt: new Date(Date.now() - 600000).toISOString()
    },
    {
      id: "alert-2",
      level: "INFO",
      title: "Strategy Started",
      message: "Breakout Strategy has been activated",
      source: "STRATEGY_ENGINE",
      isRead: true,
      createdAt: new Date(Date.now() - 1200000).toISOString()
    }
  ];

  // Mock backtests
  private mockBacktests: Backtest[] = [
    {
      id: "backtest-1",
      strategyId: "strat-1",
      name: "Q4 2024 Performance Test",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      parameters: { initialBalance: 50000, commission: 0.00002 },
      status: "COMPLETED",
      metrics: {
        totalReturn: 12.5,
        sharpeRatio: 1.85,
        maxDrawdown: 8.3,
        winRate: 67.2,
        profitFactor: 1.94,
        totalTrades: 234,
        avgTrade: 45.67,
        avgWin: 125.30,
        avgLoss: 64.50,
        largestWin: 450.00,
        largestLoss: 280.00,
        consecutiveWins: 8,
        consecutiveLosses: 3,
        annualizedReturn: 15.2
      },
      createdAt: new Date("2024-01-01").toISOString(),
      completedAt: new Date("2024-01-02").toISOString()
    },
    {
      id: "backtest-2",
      strategyId: "strat-2",
      name: "Scalping Strategy Test",
      startDate: "2024-06-01",
      endDate: "2024-08-31",
      parameters: { initialBalance: 25000, commission: 0.00003 },
      status: "RUNNING",
      metrics: null,
      createdAt: new Date("2024-08-15").toISOString(),
      completedAt: null
    }
  ];

  private systemStatuses: SystemStatus[] = [
    {
      service: "strategy-engine",
      status: "ONLINE",
      latency: 15,
      metadata: { activeStrategies: 1, memoryUsage: 45000000 },
      lastUpdate: new Date().toISOString()
    },
    {
      service: "risk-manager",
      status: "ONLINE",
      latency: 8,
      metadata: { checksPerMinute: 120, blocks: 0 },
      lastUpdate: new Date().toISOString()
    },
    {
      service: "order-manager",
      status: "ONLINE",
      latency: 12,
      metadata: { pendingOrders: 0 },
      lastUpdate: new Date().toISOString()
    },
    {
      service: "market-data",
      status: "ONLINE",
      latency: 25,
      metadata: { symbols: 10, lastUpdate: new Date().toISOString() },
      lastUpdate: new Date().toISOString()
    }
  ];

  // Account methods
  async getAccounts(userId?: string): Promise<Account[]> {
    if (userId) {
      return this.accounts.filter(account => account.userId === userId);
    }
    return this.accounts;
  }

  async createAccount(data: any, userId: string): Promise<Account> { // Added userId parameter
    const account: Account = {
      id: `acc-${Date.now()}`,
      userId: userId, // Assign the provided userId
      name: data.name,
      balance: data.balance || "0",
      equity: data.equity || "0",
      broker: data.broker,
      status: "ACTIVE",
      createdAt: new Date().toISOString()
    };
    this.accounts.push(account);
    return account;
  }

  // Strategy methods
  async getStrategies(userId?: string): Promise<Strategy[]> {
    if (userId) {
      return this.strategies.filter(strategy => strategy.userId === userId);
    }
    return this.strategies;
  }

  async createStrategy(data: any, userId: string): Promise<Strategy> { // Added userId parameter
    const strategy: Strategy = {
      id: `strat-${Date.now()}`,
      userId: userId, // Assign the provided userId
      name: data.name,
      status: "STOPPED",
      isEnabled: false,
      symbols: data.symbols || [],
      createdAt: new Date().toISOString()
    };
    this.strategies.push(strategy);
    return strategy;
  }

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
    const index = this.strategies.findIndex(s => s.id === id);
    if (index !== -1) {
      this.strategies[index] = { ...this.strategies[index], ...updates };
      return this.strategies[index];
    }
    throw new Error("Strategy not found");
  }

  // Position methods
  async getOpenPositions(accountId?: string, userId?: string): Promise<Position[]> {
    let positions = this.positions.filter(p => p.isOpen);

    if (accountId) {
      positions = positions.filter(p => p.accountId === accountId);
    }

    if (userId) {
      // To filter by userId, we need to join with accounts to get the userId
      const userAccounts = this.accounts.filter(account => account.userId === userId);
      const userAccountIds = userAccounts.map(account => account.id);
      positions = positions.filter(p => userAccountIds.includes(p.accountId));
    }

    return positions;
  }

  async getPosition(id: string): Promise<Position | null> {
    return this.positions.find(p => p.id === id) || null;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position> {
    const index = this.positions.findIndex(p => p.id === id);
    if (index !== -1) {
      this.positions[index] = { ...this.positions[index], ...updates };
      return this.positions[index];
    }
    throw new Error("Position not found");
  }

  // Order methods
  async getOrdersByAccount(accountId: string, limit?: number): Promise<Order[]> {
    const orders = this.orders.filter(o => o.accountId === accountId);
    return limit ? orders.slice(0, limit) : orders;
  }

  // Alert methods
  async createAlert(alertData: Omit<Alert, 'id' | 'createdAt' | 'isRead'>): Promise<Alert> {
    const alert: Alert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    this.alerts.unshift(alert);
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(0, 1000);
    }

    // Send Telegram notification
    try {
      const { telegramBot } = await import("./services/telegram-bot");
      await telegramBot.sendAlert(alert);
    } catch (error) {
      console.error("Failed to send Telegram alert:", error);
    }

    return alert;
  }

  async markAlertRead(id: string): Promise<Alert> {
    const index = this.alerts.findIndex(a => a.id === id);
    if (index !== -1) {
      this.alerts[index].isRead = true;
      return this.alerts[index];
    }
    throw new Error("Alert not found");
  }

  getAllAlerts(): Alert[] {
    return this.alerts.map(alert => ({
      id: alert.id || Math.random().toString(36),
      message: alert.message || 'System alert',
      level: alert.level || 'info',
      timestamp: alert.timestamp || new Date().toISOString(),
      ...alert
    }));
  }

  // Backtest methods
  async getBacktests(strategyId?: string): Promise<Backtest[]> {
    let backtests = this.mockBacktests;
    if (strategyId) {
      backtests = backtests.filter(b => b.strategyId === strategyId);
    }
    return backtests;
  }

  async getBacktest(id: string): Promise<Backtest> {
    const backtest = this.mockBacktests.find(b => b.id === id);
    if (!backtest) throw new Error("Backtest not found");
    return backtest as any;
  }

  async createBacktest(data: InsertBacktest): Promise<Backtest> {
    const backtest = {
      id: Math.random().toString(36).substring(2),
      ...data,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    this.mockBacktests.push(backtest as any);
    return backtest as any;
  }

  async updateBacktest(id: string, updates: Partial<Backtest>): Promise<Backtest> {
    const index = this.mockBacktests.findIndex(b => b.id === id);
    if (index === -1) throw new Error("Backtest not found");

    this.mockBacktests[index] = { ...this.mockBacktests[index], ...updates };
    return this.mockBacktests[index] as any;
  }

  // System status methods
  async getSystemStatus(): Promise<SystemStatus[]> {
    return this.systemStatuses;
  }

  async updateSystemStatus(service: string, updates: Partial<SystemStatus>): Promise<void> {
    const index = this.systemStatuses.findIndex(s => s.service === service);
    if (index !== -1) {
      this.systemStatuses[index] = {
        ...this.systemStatuses[index],
        ...updates,
        lastUpdate: new Date().toISOString()
      };
    } else {
      this.systemStatuses.push({
        service,
        status: "UNKNOWN",
        latency: 0,
        metadata: {},
        lastUpdate: new Date().toISOString(),
        ...updates
      });
    }
  }

  // Audit trail methods
  async getAuditTrail(period?: string): Promise<AuditTrail[]> {
    // Mock audit trail data
    return [
      {
        id: "audit-1",
        timestamp: new Date().toISOString(),
        user: "system",
        action: "STRATEGY_STARTED",
        resource: "strategy:strat-1",
        details: { strategyName: "Breakout Volatility" },
        ip: "127.0.0.1"
      },
      {
        id: "audit-2",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        user: "admin",
        action: "POSITION_CLOSED",
        resource: "position:pos-1",
        details: { symbol: "EURUSD", pnl: 125.50 },
        ip: "192.168.1.100"
      }
    ];
  }
}

export const storage = new MockStorage();