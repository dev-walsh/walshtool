
import { storage } from "../storage";

interface PerformanceMetrics {
  totalReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageTrade: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  totalTrades: number;
  averageHoldTime: number;
}

interface StrategyPerformance {
  strategyId: string;
  strategyName: string;
  metrics: PerformanceMetrics;
  dailyReturns: Array<{ date: string; return: number }>;
  drawdownHistory: Array<{ date: string; drawdown: number }>;
}

class Analytics {
  async calculateStrategyPerformance(strategyId: string, days: number = 30): Promise<StrategyPerformance> {
    try {
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy) throw new Error("Strategy not found");

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const orders = await storage.getOrdersByStrategy(strategyId);
      const filledOrders = orders.filter(order => 
        order.status === "FILLED" && 
        new Date(order.createdAt || "") >= cutoffDate
      );

      const trades = this.groupOrdersIntoTrades(filledOrders);
      const metrics = this.calculateMetrics(trades);
      const dailyReturns = this.calculateDailyReturns(trades);
      const drawdownHistory = this.calculateDrawdownHistory(dailyReturns);

      return {
        strategyId,
        strategyName: strategy.name,
        metrics,
        dailyReturns,
        drawdownHistory,
      };
    } catch (error) {
      console.error("Strategy performance calculation error:", error);
      throw error;
    }
  }

  private groupOrdersIntoTrades(orders: any[]): any[] {
    const trades: any[] = [];
    const positionMap = new Map<string, any>();

    for (const order of orders.sort((a, b) => 
      new Date(a.createdAt || "").getTime() - new Date(b.createdAt || "").getTime()
    )) {
      const key = `${order.symbol}_${order.strategyId}`;
      const existingPosition = positionMap.get(key);

      if (!existingPosition) {
        // New position
        positionMap.set(key, {
          symbol: order.symbol,
          entryTime: order.createdAt,
          entryPrice: parseFloat(order.avgFillPrice || "0"),
          quantity: parseFloat(order.quantity),
          side: order.side,
          orders: [order],
        });
      } else {
        // Adding to or closing position
        const newQty = order.side === existingPosition.side ? 
          existingPosition.quantity + parseFloat(order.quantity) :
          existingPosition.quantity - parseFloat(order.quantity);

        if (Math.abs(newQty) < 0.001) {
          // Position closed
          const exitPrice = parseFloat(order.avgFillPrice || "0");
          const pnl = existingPosition.side === "BUY" ?
            (exitPrice - existingPosition.entryPrice) * existingPosition.quantity :
            (existingPosition.entryPrice - exitPrice) * existingPosition.quantity;

          trades.push({
            ...existingPosition,
            exitTime: order.createdAt,
            exitPrice,
            pnl: pnl * 100000, // Convert to USD
            holdTime: new Date(order.createdAt || "").getTime() - 
                     new Date(existingPosition.entryTime).getTime(),
          });

          positionMap.delete(key);
        } else {
          // Update position
          existingPosition.quantity = Math.abs(newQty);
          existingPosition.side = newQty > 0 ? existingPosition.side : 
            (existingPosition.side === "BUY" ? "SELL" : "BUY");
          existingPosition.orders.push(order);
        }
      }
    }

    return trades;
  }

  private calculateMetrics(trades: any[]): PerformanceMetrics {
    if (trades.length === 0) {
      return this.getDefaultMetrics();
    }

    const pnls = trades.map(t => t.pnl);
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);

    const totalReturn = pnls.reduce((sum, p) => sum + p, 0);
    const winRate = (wins.length / trades.length) * 100;
    const avgWin = wins.length > 0 ? wins.reduce((sum, w) => sum + w, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, l) => sum + l, 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Calculate drawdown
    let runningPnL = 0;
    let peak = 0;
    let maxDrawdown = 0;

    for (const trade of trades) {
      runningPnL += trade.pnl;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Calculate Sharpe ratio
    const returns = pnls.map(p => p / 100000); // Normalize
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    const sharpeRatio = volatility > 0 ? (avgReturn / volatility) * Math.sqrt(252) : 0;

    return {
      totalReturn,
      sharpeRatio,
      sortinoRatio: this.calculateSortinoRatio(returns),
      maxDrawdown: (maxDrawdown / 100000) * 100, // As percentage
      winRate,
      profitFactor,
      averageTrade: totalReturn / trades.length,
      largestWin: Math.max(...pnls),
      largestLoss: Math.min(...pnls),
      consecutiveWins: this.calculateConsecutiveWins(pnls),
      consecutiveLosses: this.calculateConsecutiveLosses(pnls),
      totalTrades: trades.length,
      averageHoldTime: trades.reduce((sum, t) => sum + t.holdTime, 0) / trades.length,
    };
  }

  private calculateSortinoRatio(returns: number[]): number {
    const targetReturn = 0;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const downside = returns.filter(r => r < targetReturn);
    
    if (downside.length === 0) return 0;
    
    const downsideDeviation = Math.sqrt(
      downside.reduce((sum, r) => sum + Math.pow(r - targetReturn, 2), 0) / downside.length
    );
    
    return downsideDeviation > 0 ? (avgReturn / downsideDeviation) * Math.sqrt(252) : 0;
  }

  private calculateConsecutiveWins(pnls: number[]): number {
    let maxConsecutive = 0;
    let current = 0;
    
    for (const pnl of pnls) {
      if (pnl > 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    }
    
    return maxConsecutive;
  }

  private calculateConsecutiveLosses(pnls: number[]): number {
    let maxConsecutive = 0;
    let current = 0;
    
    for (const pnl of pnls) {
      if (pnl < 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    }
    
    return maxConsecutive;
  }

  private calculateDailyReturns(trades: any[]): Array<{ date: string; return: number }> {
    const dailyMap = new Map<string, number>();
    
    for (const trade of trades) {
      const date = new Date(trade.exitTime).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || 0;
      dailyMap.set(date, existing + trade.pnl);
    }

    return Array.from(dailyMap.entries())
      .map(([date, pnl]) => ({ date, return: pnl / 100000 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateDrawdownHistory(dailyReturns: Array<{ date: string; return: number }>): Array<{ date: string; drawdown: number }> {
    let runningReturn = 0;
    let peak = 0;
    
    return dailyReturns.map(day => {
      runningReturn += day.return;
      if (runningReturn > peak) peak = runningReturn;
      const drawdown = ((peak - runningReturn) / peak) * 100;
      
      return {
        date: day.date,
        drawdown: drawdown || 0,
      };
    });
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      averageTrade: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      totalTrades: 0,
      averageHoldTime: 0,
    };
  }

  async getSessionStatus(): Promise<any> {
    const currentSessions = [];
    
    for (const session of this.sessions) {
      const tradeability = await this.isSymbolTradeable(session.allowedSymbols[0]);
      currentSessions.push({
        ...session,
        isCurrentlyActive: tradeability.allowed,
      });
    }

    return {
      sessions: currentSessions,
      newsBlackout: this.isNewsBlackout,
      upcomingEvents: this.newsEvents.slice(0, 5),
    };
  }
}

export const analytics = new Analytics();
export const sessionManager = new SessionManager();
