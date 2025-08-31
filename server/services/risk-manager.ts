import { Account, Strategy, RiskEvent, InsertRiskEvent } from "@shared/schema";
import { storage } from "../storage";
import { notificationManager } from "./notification-manager";

interface RiskCheckResult {
  approved: boolean;
  reason?: string;
  adjustedQuantity?: number;
}

interface RiskStatus {
  dailyLossUsed: number;
  dailyLossLimit: number;
  maxDrawdown: number;
  maxDrawdownLimit: number;
  totalExposure: number;
  maxExposure: number;
  positionCount: number;
  maxPositions: number;
}

class RiskManager {
  private isHealthy_ = true;
  private checksPerMinute = 0;
  private blockCount = 0;
  private emergencyStopActive = false;
  private isEmergencyStop = false; // Added this property

  async validateTrade(signal: any, strategy: Strategy): Promise<RiskCheckResult> {
    this.checksPerMinute++;

    try {
      if (this.emergencyStopActive) {
        return { approved: false, reason: "Emergency stop is active" };
      }

      // Get account information (simplified - would get from signal/strategy context)
      const accounts = await storage.getAccounts();
      const account = accounts[0]; // Demo account

      if (!account) {
        return { approved: false, reason: "No active account found" };
      }

      // Check daily loss limit
      const dailyLossCheck = await this.checkDailyLoss(account, signal);
      if (!dailyLossCheck.approved) {
        await this.logRiskEvent(account.id, strategy.id, "CRITICAL", "DAILY_LOSS_LIMIT", "Trade blocked");
        this.blockCount++;
        return dailyLossCheck;
      }

      // Check max drawdown
      const drawdownCheck = await this.checkMaxDrawdown(account, signal);
      if (!drawdownCheck.approved) {
        await this.logRiskEvent(account.id, strategy.id, "CRITICAL", "MAX_DRAWDOWN", "Trade blocked");
        this.blockCount++;
        return drawdownCheck;
      }

      // Check position limits
      const positionCheck = await this.checkPositionLimits(account, signal);
      if (!positionCheck.approved) {
        await this.logRiskEvent(account.id, strategy.id, "WARNING", "POSITION_LIMIT", "Trade blocked");
        this.blockCount++;
        return positionCheck;
      }

      // Check exposure limits
      const exposureCheck = await this.checkExposureLimits(account, signal);
      if (!exposureCheck.approved) {
        await this.logRiskEvent(account.id, strategy.id, "WARNING", "EXPOSURE_LIMIT", "Trade blocked");
        this.blockCount++;
        return exposureCheck;
      }

      return { approved: true };
    } catch (error) {
      console.error("Risk validation error:", error);
      return { approved: false, reason: "Risk validation system error" };
    }
  }

  private async checkDailyLoss(account: Account, signal: any): Promise<RiskCheckResult> {
    // Get today's orders for this account
    const orders = await storage.getOrdersByAccount(account.id, 100);
    const today = new Date();

    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt || "");
      return orderDate.toDateString() === today.toDateString();
    });

    // Calculate daily P&L (simplified)
    let dailyPnL = 0;
    for (const order of todayOrders) {
      if (order.status === "FILLED") {
        // This would calculate actual P&L from fills
        dailyPnL += (Math.random() - 0.6) * 500; // Mock calculation with slight negative bias
      }
    }

    const dailyLossLimit = account.propRules ?
      (account.propRules as any).dailyLossLimit || 5000 : 5000;

    if (Math.abs(dailyPnL) >= dailyLossLimit && dailyPnL < 0) {
      await notificationManager.sendRiskWarning(
        `Daily loss limit exceeded: $${Math.abs(dailyPnL).toFixed(2)} > $${dailyLossLimit.toFixed(2)}`
      );
      return { approved: false, reason: `Daily loss limit of $${dailyLossLimit} reached` };
    }

    return { approved: true };
  }

  private async checkMaxDrawdown(account: Account, signal: any): Promise<RiskCheckResult> {
    const currentEquity = parseFloat(account.equity || "0");
    const balance = parseFloat(account.balance || "0");
    const drawdownPercent = ((balance - currentEquity) / balance) * 100;

    const maxDrawdownLimit = account.propRules ?
      (account.propRules as any).maxDrawdownLimit || 15 : 15;

    if (drawdownPercent >= maxDrawdownLimit) {
      await notificationManager.sendRiskWarning(
        `Max drawdown limit reached: ${drawdownPercent.toFixed(2)}% > ${maxDrawdownLimit}%`
      );
      return { approved: false, reason: `Max drawdown limit of ${maxDrawdownLimit}% reached` };
    }

    return { approved: true };
  }

  private async checkPositionLimits(account: Account, signal: any): Promise<RiskCheckResult> {
    const openPositions = await storage.getOpenPositions(account.id);
    const maxPositions = account.propRules ?
      (account.propRules as any).maxPositions || 10 : 10;

    if (openPositions.length >= maxPositions) {
      await notificationManager.sendRiskWarning(
        `Maximum position limit reached: ${openPositions.length} >= ${maxPositions}`
      );
      return { approved: false, reason: `Maximum position limit of ${maxPositions} reached` };
    }

    return { approved: true };
  }

  private async checkExposureLimits(account: Account, signal: any): Promise<RiskCheckResult> {
    const openPositions = await storage.getOpenPositions(account.id);

    // Calculate total exposure
    let totalExposure = 0;
    for (const position of openPositions) {
      const positionValue = parseFloat(position.quantity || "0") * parseFloat(position.currentPrice || "0");
      totalExposure += positionValue;
    }

    // Add proposed trade exposure
    const proposedExposure = signal.quantity * (signal.price || 1.0);
    const newTotalExposure = totalExposure + proposedExposure;

    const maxExposure = account.propRules ?
      (account.propRules as any).maxExposure || 75000 : 75000;

    if (newTotalExposure > maxExposure) {
      await notificationManager.sendRiskWarning(
        `Total exposure limit would be exceeded: $${newTotalExposure.toFixed(2)} > $${maxExposure.toFixed(2)}`
      );
      return { approved: false, reason: `Total exposure limit of $${maxExposure} would be exceeded` };
    }

    return { approved: true };
  }

  private async logRiskEvent(
    accountId: string,
    strategyId: string | null,
    level: "INFO" | "WARNING" | "CRITICAL",
    rule: string,
    action: string
  ): Promise<void> {
    const riskEvent: InsertRiskEvent = {
      accountId,
      strategyId,
      level,
      rule,
      action,
      details: { timestamp: new Date().toISOString() }
    };

    await storage.createRiskEvent(riskEvent);
  }

  async getCurrentRiskStatus(): Promise<RiskStatus> {
    const accounts = await storage.getAccounts();
    const account = accounts[0]; // Demo account
    const openPositions = await storage.getOpenPositions(account?.id);

    if (!account) {
      throw new Error("No active account found");
    }

    // Calculate current risk metrics
    let totalExposure = 0;
    for (const position of openPositions) {
      const positionValue = parseFloat(position.quantity || "0") * parseFloat(position.currentPrice || "0");
      totalExposure += positionValue;
    }

    const balance = parseFloat(account.balance || "0");
    const equity = parseFloat(account.equity || "0");
    const drawdownPercent = ((balance - equity) / balance) * 100;

    // Mock daily loss calculation
    const dailyLossUsed = Math.max(0, balance - equity) * 0.25;

    return {
      dailyLossUsed: Math.floor(dailyLossUsed),
      dailyLossLimit: 5000,
      maxDrawdown: Math.max(0, drawdownPercent),
      maxDrawdownLimit: 15,
      totalExposure: Math.floor(totalExposure),
      maxExposure: 75000,
      positionCount: openPositions.length,
      maxPositions: 10,
    };
  }

  async emergencyStop(): Promise<void> {
    console.log("🚨 EMERGENCY STOP TRIGGERED");
    this.emergencyStopActive = true;

    // Send immediate notification
    await notificationManager.sendAlert("CRITICAL",
      "Emergency stop triggered - all trading halted immediately"
    );

    // Close all open positions
    const openPositions = await storage.getOpenPositions();
    for (const position of openPositions) {
      await storage.updatePosition(position.id, { isOpen: false });
    }

    // Log emergency stop
    await storage.createAlert({
      level: "CRITICAL",
      title: "Emergency Stop",
      message: "Emergency stop triggered - all trading halted",
      source: "RISK_MANAGER",
    });
  }

  isHealthy(): boolean {
    return !this.isEmergencyStop;
  }

  async getLatency(): Promise<number> {
    return Math.floor(Math.random() * 10) + 2; // Mock latency between 2-12ms
  }

  getChecksPerMinute(): number {
    return 120; // Mock checks per minute
  }

  getBlockCount(): number {
    return 0; // Mock number of risk blocks
  }
}

export const riskManager = new RiskManager();