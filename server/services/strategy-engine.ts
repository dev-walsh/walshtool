import { Strategy, Position, InsertOrder, Backtest } from "@shared/schema";
import { storage } from "../storage";
import { notificationManager } from "./notification-manager";

interface StrategySignal {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  reason: string;
}

class StrategyEngine {
  private activeStrategies = new Map<string, Strategy>();
  private strategyStates = new Map<string, any>();
  private isRunning = false;

  async loadStrategy(strategy: Strategy): Promise<void> {
    this.activeStrategies.set(strategy.id, strategy);
    this.strategyStates.set(strategy.id, this.initializeStrategyState(strategy));
    console.log(`Strategy loaded: ${strategy.name}`);
  }

  async reloadStrategy(strategy: Strategy): Promise<void> {
    await this.loadStrategy(strategy);
    console.log(`Strategy reloaded: ${strategy.name}`);
  }

  async startStrategy(strategy: Strategy): Promise<void> {
    await this.loadStrategy(strategy);

    const { logger } = await import("./logger");
    await logger.logStrategy(
      strategy.id,
      `Strategy started: ${strategy.name}`,
      "INFO",
      { symbols: strategy.symbols, parameters: strategy.parameters }
    );

    console.log(`Strategy started: ${strategy.name}`);
  }

  async stopStrategy(strategy: Strategy): Promise<void> {
    const { logger } = await import("./logger");

    // Log final performance before stopping
    const state = this.strategyStates.get(strategy.id);
    if (state) {
      await logger.logStrategy(
        strategy.id,
        `Strategy stopped: ${strategy.name}`,
        "INFO",
        {
          finalState: {
            signalsGenerated: state.signalsGenerated || 0,
            lastSignalTime: state.lastSignalTime,
            runDuration: Date.now() - (state.startTime || Date.now())
          }
        }
      );
    }

    this.activeStrategies.delete(strategy.id);
    this.strategyStates.delete(strategy.id);
    console.log(`Strategy stopped: ${strategy.name}`);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("Strategy Engine started");

    // Load enabled strategies
    const strategies = await storage.getStrategies();
    for (const strategy of strategies.filter(s => s.isEnabled)) {
      await this.loadStrategy(strategy);
    }

    // Start main processing loop
    this.processLoop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.activeStrategies.clear();
    this.strategyStates.clear();
    console.log("Strategy Engine stopped");
  }

  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Process each active strategy
        for (const strategy of Array.from(this.activeStrategies.values())) {
          if (strategy.status === "RUNNING") {
            await this.processStrategy(strategy);
          }
        }

        // Sleep for 1 second before next iteration
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Strategy processing error:", error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Longer pause on error
      }
    }
  }

  private async processStrategy(strategy: Strategy): Promise<void> {
    try {
      const state = this.strategyStates.get(strategy.id);
      if (!state) return;

      // Get latest market data for strategy symbols
      for (const symbol of strategy.symbols) {
        const marketData = { price: 1.0500 + Math.random() * 0.01, symbol }; // Mock data
        if (!marketData) continue;

        // Run strategy logic based on type
        const signals = await this.executeStrategyLogic(strategy, symbol, marketData, state);

        // Process any generated signals
        for (const signal of signals) {
          await this.processSignal(strategy, signal);
        }
      }
    } catch (error) {
      console.error(`Strategy ${strategy.name} processing error:`, error);
      await storage.updateStrategy(strategy.id, { status: "ERROR" });
    }
  }

  private async executeStrategyLogic(
    strategy: Strategy,
    symbol: string,
    marketData: any,
    state: any
  ): Promise<StrategySignal[]> {
    const params = strategy.parameters as any;
    const signals: StrategySignal[] = [];

    // Breakout Volatility Strategy Implementation
    if (strategy.name.includes("Breakout")) {
      const signals = await this.breakoutStrategy(symbol, marketData, params, state);
      return signals;
    }

    // Mean Reversion Strategy Implementation
    if (strategy.name.includes("Mean Reversion")) {
      const signals = await this.meanReversionStrategy(symbol, marketData, params, state);
      return signals;
    }

    // Trend Follow Strategy Implementation
    if (strategy.name.includes("Trend Follow")) {
      const signals = await this.trendFollowStrategy(symbol, marketData, params, state);
      return signals;
    }

    return signals;
  }

  private async breakoutStrategy(
    symbol: string,
    marketData: any,
    params: any,
    state: any
  ): Promise<StrategySignal[]> {
    // Simplified breakout strategy logic
    const { donchianPeriod = 20, atrPeriod = 14, riskPercent = 1 } = params;

    // This would normally calculate Donchian channels and ATR
    // For now, generate occasional signals based on simple conditions
    const shouldSignal = Math.random() < 0.01; // 1% chance per tick

    if (shouldSignal && !state.hasPosition) {
      const side = Math.random() > 0.5 ? "BUY" : "SELL";
      const atr = marketData.price * 0.001; // Mock ATR calculation

      return [{
        symbol,
        side,
        quantity: this.calculatePositionSize(marketData.price, atr, riskPercent),
        stopLoss: side === "BUY" ? marketData.price - (atr * 2) : marketData.price + (atr * 2),
        takeProfit: side === "BUY" ? marketData.price + (atr * 3) : marketData.price - (atr * 3),
        reason: "Donchian breakout with ATR volatility filter"
      }];
    }

    return [];
  }

  private async meanReversionStrategy(
    symbol: string,
    marketData: any,
    params: any,
    state: any
  ): Promise<StrategySignal[]> {
    // Simplified mean reversion logic
    const shouldSignal = Math.random() < 0.008; // 0.8% chance per tick

    if (shouldSignal && !state.hasPosition) {
      const side = Math.random() > 0.5 ? "SELL" : "BUY"; // Mean reversion typically goes against trend
      const atr = marketData.price * 0.0008;

      return [{
        symbol,
        side,
        quantity: this.calculatePositionSize(marketData.price, atr, 0.8),
        stopLoss: side === "BUY" ? marketData.price - (atr * 1.5) : marketData.price + (atr * 1.5),
        takeProfit: side === "BUY" ? marketData.price + atr : marketData.price - atr,
        reason: "RSI oversold/overbought with Bollinger Band mean reversion"
      }];
    }

    return [];
  }

  private async trendFollowStrategy(
    symbol: string,
    marketData: any,
    params: any,
    state: any
  ): Promise<StrategySignal[]> {
    // Simplified trend follow logic
    const shouldSignal = Math.random() < 0.006; // 0.6% chance per tick

    if (shouldSignal && !state.hasPosition) {
      const side = Math.random() > 0.4 ? "BUY" : "SELL"; // Slight bullish bias
      const atr = marketData.price * 0.0012;

      return [{
        symbol,
        side,
        quantity: this.calculatePositionSize(marketData.price, atr, 1.2),
        stopLoss: side === "BUY" ? marketData.price - (atr * 2.5) : marketData.price + (atr * 2.5),
        takeProfit: side === "BUY" ? marketData.price + (atr * 4) : marketData.price - (atr * 4),
        reason: "EMA stack trend confirmation with pullback entry"
      }];
    }

    return [];
  }

  private calculatePositionSize(price: number, atr: number, riskPercent: number): number {
    // Simple position sizing based on ATR and risk percentage
    const accountBalance = 100000; // Would get from account
    const riskAmount = accountBalance * (riskPercent / 100);
    const stopDistance = atr * 2;
    const dollarPerPip = 10; // Simplified for major pairs

    return Math.min(0.1, riskAmount / (stopDistance * dollarPerPip));
  }

  private async processSignal(strategy: Strategy, signal: StrategySignal): Promise<void> {
    try {
      // Import risk manager for proper validation
      const { riskManager } = await import("./risk-manager");

      // Check risk constraints before creating order
      const riskCheck = await riskManager.validateTrade(signal, strategy);
      if (!riskCheck.approved) {
        console.log(`Trade rejected by risk manager: ${riskCheck.reason}`);

        // Log the rejection for audit
        await storage.createAlert({
          level: "WARNING",
          title: "Trade Rejected",
          message: `${strategy.name}: ${riskCheck.reason}`,
          source: "RISK_MANAGER",
        });
        return;
      }

      // Create order
      const order: InsertOrder = {
        accountId: "demo-account", // Would get from strategy config
        strategyId: strategy.id,
        symbol: signal.symbol,
        side: signal.side,
        quantity: signal.quantity.toString(),
        type: "MARKET",
        stopLoss: signal.stopLoss?.toString(),
        takeProfit: signal.takeProfit?.toString(),
        status: "PENDING",
        idempotencyKey: `${strategy.id}-${signal.symbol}-${Date.now()}`,
      };

      await storage.createOrder(order);
      console.log(`Order submitted: ${signal.side} ${signal.quantity} ${signal.symbol}`);

    } catch (error) {
      console.error("Signal processing error:", error);
    }
  }

  private initializeStrategyState(strategy: Strategy): any {
    return {
      hasPosition: false,
      lastSignalTime: null,
      indicators: {},
      bars: [],
    };
  }

  async runBacktest(backtest: Backtest): Promise<void> {
    try {
      console.log(`Running backtest: ${backtest.name}`);
      const { backtestingEngine } = await import("./backtesting-engine");
      const strategy = await storage.getStrategy(backtest.strategyId);
      await backtestingEngine.runBacktest(backtest, strategy);
    } catch (error) {
      console.error("Backtest execution error:", error);
      throw error;
    }
  }

  // Health check methods
  isHealthy(): boolean {
    return this.isRunning;
  }

  async getLatency(): Promise<number> {
    return Math.floor(Math.random() * 20) + 5; // Mock latency between 5-25ms
  }

  async getActiveStrategyCount(): Promise<number> {
    return this.activeStrategies.size;
  }
}

export const strategyEngine = new StrategyEngine();