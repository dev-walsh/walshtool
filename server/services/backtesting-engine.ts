
import { Strategy, Backtest, InsertBacktest } from "@shared/schema";
import { storage } from "../storage";
import { marketDataService } from "./market-data";

interface BacktestTrade {
  symbol: string;
  side: "BUY" | "SELL";
  entry: number;
  exit: number;
  quantity: number;
  entryTime: Date;
  exitTime: Date;
  pnl: number;
  commission: number;
}

interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgTrade: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

class BacktestingEngine {
  private isRunning = false;
  private currentBacktest: Backtest | null = null;

  async runBacktest(backtest: Backtest, strategy: Strategy): Promise<BacktestMetrics> {
    this.isRunning = true;
    this.currentBacktest = backtest;

    try {
      console.log(`Starting backtest: ${backtest.name}`);
      await storage.updateBacktest(backtest.id, { status: "RUNNING" });

      // Generate historical data for backtesting
      const historicalData = this.generateHistoricalData(
        strategy.symbols,
        new Date(backtest.startDate || "2023-01-01"),
        new Date(backtest.endDate || "2024-01-01")
      );

      const trades: BacktestTrade[] = [];
      let currentBalance = parseFloat(backtest.initialBalance || "10000");
      let equity = currentBalance;
      let peak = currentBalance;
      let maxDrawdown = 0;

      // Run strategy against historical data
      for (const dataPoint of historicalData) {
        if (!this.isRunning) break;

        const signal = await this.executeStrategyLogic(strategy, dataPoint);
        
        if (signal) {
          const trade = this.simulateTrade(signal, dataPoint, currentBalance * 0.02); // 2% risk per trade
          if (trade) {
            trades.push(trade);
            currentBalance += trade.pnl - trade.commission;
            equity = currentBalance;

            // Track drawdown
            if (equity > peak) {
              peak = equity;
            }
            const drawdown = ((peak - equity) / peak) * 100;
            if (drawdown > maxDrawdown) {
              maxDrawdown = drawdown;
            }
          }
        }
      }

      const metrics = this.calculateMetrics(trades, currentBalance, parseFloat(backtest.initialBalance || "10000"));
      
      await storage.updateBacktest(backtest.id, {
        status: "COMPLETED",
        metrics: metrics as any,
        finalEquity: currentBalance.toString()
      });

      console.log(`Backtest completed: ${backtest.name}`);
      return metrics;

    } catch (error) {
      console.error("Backtest execution error:", error);
      await storage.updateBacktest(backtest.id, { status: "FAILED" });
      throw error;
    } finally {
      this.isRunning = false;
      this.currentBacktest = null;
    }
  }

  private generateHistoricalData(symbols: string[], startDate: Date, endDate: Date): any[] {
    const data: any[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      for (const symbol of symbols) {
        const basePrice = this.getBasePrice(symbol);
        const price = basePrice + (Math.random() - 0.5) * basePrice * 0.02; // 2% volatility
        
        data.push({
          symbol,
          timestamp: new Date(current),
          open: price,
          high: price * (1 + Math.random() * 0.01),
          low: price * (1 - Math.random() * 0.01),
          close: price + (Math.random() - 0.5) * price * 0.005,
          volume: Math.floor(Math.random() * 1000000) + 100000
        });
      }
      current.setHours(current.getHours() + 1); // Hourly data
    }
    
    return data;
  }

  private getBasePrice(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      "EURUSD": 1.0850,
      "GBPUSD": 1.2650,
      "USDJPY": 149.50,
      "AUDUSD": 0.6750,
    };
    return basePrices[symbol] || 1.0;
  }

  private async executeStrategyLogic(strategy: Strategy, dataPoint: any): Promise<any> {
    // Simplified strategy logic for backtesting
    const shouldSignal = Math.random() < 0.05; // 5% chance for demo
    
    if (shouldSignal) {
      return {
        symbol: dataPoint.symbol,
        side: Math.random() > 0.5 ? "BUY" : "SELL",
        price: dataPoint.close,
        timestamp: dataPoint.timestamp
      };
    }
    return null;
  }

  private simulateTrade(signal: any, dataPoint: any, riskAmount: number): BacktestTrade | null {
    const commission = 7; // $7 per trade
    const spread = dataPoint.close * 0.0002; // 2 pip spread
    const stopLoss = signal.side === "BUY" ? 
      dataPoint.close * 0.99 : dataPoint.close * 1.01; // 1% stop loss
    const takeProfit = signal.side === "BUY" ? 
      dataPoint.close * 1.02 : dataPoint.close * 0.98; // 2% take profit

    // Simulate exit (randomly choose win/loss based on probabilities)
    const isWin = Math.random() > 0.4; // 60% win rate for demo
    const exitPrice = isWin ? takeProfit : stopLoss;
    
    const quantity = riskAmount / Math.abs(dataPoint.close - stopLoss);
    const pnl = signal.side === "BUY" ? 
      (exitPrice - dataPoint.close) * quantity :
      (dataPoint.close - exitPrice) * quantity;

    return {
      symbol: signal.symbol,
      side: signal.side,
      entry: dataPoint.close,
      exit: exitPrice,
      quantity,
      entryTime: new Date(dataPoint.timestamp),
      exitTime: new Date(dataPoint.timestamp.getTime() + Math.random() * 3600000), // Exit within an hour
      pnl,
      commission
    };
  }

  private calculateMetrics(trades: BacktestTrade[], finalBalance: number, initialBalance: number): BacktestMetrics {
    const totalReturn = ((finalBalance - initialBalance) / initialBalance) * 100;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;
    
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
    const avgTrade = trades.length > 0 ? 
      trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length : 0;

    return {
      totalReturn,
      annualizedReturn: totalReturn, // Simplified
      sharpeRatio: 1.85, // Mock calculation
      maxDrawdown: Math.random() * 15, // Mock
      winRate,
      profitFactor,
      totalTrades: trades.length,
      avgTrade,
      avgWin,
      avgLoss,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
      consecutiveWins: this.calculateConsecutiveWins(trades),
      consecutiveLosses: this.calculateConsecutiveLosses(trades)
    };
  }

  private calculateConsecutiveWins(trades: BacktestTrade[]): number {
    let maxConsecutive = 0;
    let current = 0;
    
    for (const trade of trades) {
      if (trade.pnl > 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    }
    
    return maxConsecutive;
  }

  private calculateConsecutiveLosses(trades: BacktestTrade[]): number {
    let maxConsecutive = 0;
    let current = 0;
    
    for (const trade of trades) {
      if (trade.pnl < 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    }
    
    return maxConsecutive;
  }

  stopBacktest(): void {
    this.isRunning = false;
  }
}

export const backtestingEngine = new BacktestingEngine();
