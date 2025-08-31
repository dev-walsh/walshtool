
interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  dailyReturns: number[];
}

class PerformanceTracker {
  private metrics: Map<string, PerformanceMetrics> = new Map();

  async calculateMetrics(accountId: string): Promise<PerformanceMetrics> {
    const trades = await storage.getRecentTrades(accountId);
    const positions = await storage.getClosedPositions(accountId);

    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => parseFloat(t.pnl || '0') > 0);
    const losingTrades = trades.filter(t => parseFloat(t.pnl || '0') < 0);

    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      Math.abs(losingTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / losingTrades.length) : 0;

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Calculate daily returns for Sharpe ratio
    const dailyReturns = this.calculateDailyReturns(trades);
    const sharpeRatio = this.calculateSharpeRatio(dailyReturns);
    const maxDrawdown = this.calculateMaxDrawdown(trades);

    const metrics: PerformanceMetrics = {
      totalTrades,
      winRate,
      avgWin,
      avgLoss,
      maxDrawdown,
      sharpeRatio,
      profitFactor,
      dailyReturns
    };

    this.metrics.set(accountId, metrics);
    return metrics;
  }

  private calculateDailyReturns(trades: any[]): number[] {
    const dailyPnL = new Map<string, number>();
    
    trades.forEach(trade => {
      const date = new Date(trade.createdAt).toDateString();
      const pnl = parseFloat(trade.pnl || '0');
      dailyPnL.set(date, (dailyPnL.get(date) || 0) + pnl);
    });

    return Array.from(dailyPnL.values());
  }

  private calculateSharpeRatio(dailyReturns: number[]): number {
    if (dailyReturns.length < 2) return 0;

    const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / (dailyReturns.length - 1);
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  }

  private calculateMaxDrawdown(trades: any[]): number {
    let runningTotal = 0;
    let peak = 0;
    let maxDrawdown = 0;

    trades.forEach(trade => {
      runningTotal += parseFloat(trade.pnl || '0');
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = (peak - runningTotal) / peak * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return maxDrawdown;
  }

  getMetrics(accountId: string): PerformanceMetrics | undefined {
    return this.metrics.get(accountId);
  }
}

export const performanceTracker = new PerformanceTracker();
