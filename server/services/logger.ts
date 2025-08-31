
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  type: 'strategy' | 'risk' | 'order' | 'system' | 'telegram';
  message: string;
  symbol?: string;
  metadata?: any;
}

interface LogFilter {
  type?: string;
  level?: string;
  symbol?: string;
  limit?: number;
}

interface LogStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  recentActivity: number;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;

  constructor() {
    // Initialize with some mock logs
    this.initializeMockLogs();
  }

  private initializeMockLogs() {
    const mockLogs: LogEntry[] = [
      {
        id: "log-1",
        timestamp: new Date().toISOString(),
        level: "INFO",
        type: "strategy",
        message: "Strategy Breakout Volatility started",
        symbol: "EURUSD",
        metadata: { strategyId: "strat-1" }
      },
      {
        id: "log-2",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: "WARNING", 
        type: "risk",
        message: "High volatility detected",
        symbol: "GBPUSD",
        metadata: { volatility: 0.025 }
      },
      {
        id: "log-3",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        level: "INFO",
        type: "order",
        message: "Order executed successfully",
        symbol: "USDJPY",
        metadata: { orderId: "order-123", size: 10000 }
      },
      {
        id: "log-4",
        timestamp: new Date(Date.now() - 900000).toISOString(),
        level: "ERROR",
        type: "system",
        message: "Broker connection timeout",
        metadata: { broker: "OANDA", timeout: 5000 }
      }
    ];

    this.logs = mockLogs;
  }

  log(level: LogEntry['level'], type: LogEntry['type'], message: string, symbol?: string, metadata?: any) {
    const logEntry: LogEntry = {
      id: Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      level,
      type,
      message,
      symbol,
      metadata
    };

    this.logs.unshift(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console output for debugging
    console.log(`[${level}][${type}] ${message}${symbol ? ` (${symbol})` : ""}`);
  }

  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = this.logs;

    if (filter?.type && filter.type !== "all") {
      filteredLogs = filteredLogs.filter(log => log.type === filter.type);
    }

    if (filter?.level && filter.level !== "all") {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter?.symbol && filter.symbol !== "all") {
      filteredLogs = filteredLogs.filter(log => log.symbol === filter.symbol);
    }

    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }

    return filteredLogs;
  }

  getLogStats(): LogStats {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    return {
      totalLogs: this.logs.length,
      errorCount: this.logs.filter(log => log.level === "ERROR" || log.level === "CRITICAL").length,
      warningCount: this.logs.filter(log => log.level === "WARNING").length,
      recentActivity: this.logs.filter(log => new Date(log.timestamp).getTime() > oneHourAgo).length
    };
  }

  // Convenience methods
  debug(type: LogEntry['type'], message: string, symbol?: string, metadata?: any) {
    this.log('DEBUG', type, message, symbol, metadata);
  }

  info(type: LogEntry['type'], message: string, symbol?: string, metadata?: any) {
    this.log('INFO', type, message, symbol, metadata);
  }

  warning(type: LogEntry['type'], message: string, symbol?: string, metadata?: any) {
    this.log('WARNING', type, message, symbol, metadata);
  }

  error(type: LogEntry['type'], message: string, symbol?: string, metadata?: any) {
    this.log('ERROR', type, message, symbol, metadata);
  }

  critical(type: LogEntry['type'], message: string, symbol?: string, metadata?: any) {
    this.log('CRITICAL', type, message, symbol, metadata);
  }
}

export const logger = new Logger();
