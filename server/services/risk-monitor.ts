
import { storage } from "../storage";
import { logger } from "./logger";

interface RiskMetrics {
  equityHighWaterMark: number;
  currentDrawdown: number;
  consecutiveLosses: number;
  dailyVaR: number;
  sharpeRatio: number;
  volatility: number;
}

class RiskMonitor {
  private metrics: RiskMetrics = {
    equityHighWaterMark: 100000,
    currentDrawdown: 0,
    consecutiveLosses: 0,
    dailyVaR: 0,
    sharpeRatio: 0,
    volatility: 0,
  };

  private dailyReturns: number[] = [];
  private consecutiveLossCount = 0;

  async updateMetrics(): Promise<void> {
    try {
      const accounts = await storage.getAccounts();
      const account = accounts[0];
      
      if (!account) return;

      const currentEquity = parseFloat(account.equity || "0");
      const balance = parseFloat(account.balance || "0");

      // Update high water mark
      if (currentEquity > this.metrics.equityHighWaterMark) {
        this.metrics.equityHighWaterMark = currentEquity;
      }

      // Calculate current drawdown
      this.metrics.currentDrawdown = ((this.metrics.equityHighWaterMark - currentEquity) / this.metrics.equityHighWaterMark) * 100;

      // Get recent orders to calculate daily returns
      const orders = await storage.getOrdersByAccount(account.id, 100);
      const today = new Date();
      const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt || "");
        return orderDate.toDateString() === today.toDateString();
      });

      // Calculate daily P&L
      let dailyPnL = 0;
      for (const order of todayOrders) {
        if (order.status === "FILLED") {
          // Mock P&L calculation - would be actual in real system
          dailyPnL += (Math.random() - 0.55) * 300;
        }
      }

      const dailyReturn = (dailyPnL / balance) * 100;
      this.dailyReturns.push(dailyReturn);
      
      // Keep only last 30 days
      if (this.dailyReturns.length > 30) {
        this.dailyReturns.shift();
      }

      // Update consecutive losses
      if (dailyReturn < 0) {
        this.consecutiveLossCount++;
      } else {
        this.consecutiveLossCount = 0;
      }
      this.metrics.consecutiveLosses = this.consecutiveLossCount;

      // Calculate Sharpe ratio and volatility
      if (this.dailyReturns.length >= 10) {
        const avgReturn = this.dailyReturns.reduce((sum, ret) => sum + ret, 0) / this.dailyReturns.length;
        const variance = this.dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / this.dailyReturns.length;
        this.metrics.volatility = Math.sqrt(variance);
        this.metrics.sharpeRatio = this.metrics.volatility > 0 ? (avgReturn / this.metrics.volatility) : 0;
      }

      // Check for risk alerts
      await this.checkRiskAlerts();

    } catch (error) {
      console.error("Risk metrics update error:", error);
      await logger.log({
        type: "RISK",
        level: "ERROR",
        message: "Failed to update risk metrics",
        details: { error: error.message }
      });
    }
  }

  private async checkRiskAlerts(): Promise<void> {
    // High drawdown alert
    if (this.metrics.currentDrawdown > 10) {
      await logger.logRisk(
        `High drawdown alert: ${this.metrics.currentDrawdown.toFixed(2)}%`,
        "CRITICAL",
        { drawdown: this.metrics.currentDrawdown }
      );
    }

    // Consecutive losses alert
    if (this.metrics.consecutiveLosses >= 5) {
      await logger.logRisk(
        `Consecutive losses alert: ${this.metrics.consecutiveLosses} trades`,
        "WARN",
        { consecutiveLosses: this.metrics.consecutiveLosses }
      );
    }

    // Low Sharpe ratio alert
    if (this.metrics.sharpeRatio < -0.5 && this.dailyReturns.length >= 20) {
      await logger.logRisk(
        `Poor performance alert: Sharpe ratio ${this.metrics.sharpeRatio.toFixed(2)}`,
        "WARN",
        { sharpeRatio: this.metrics.sharpeRatio }
      );
    }
  }

  getMetrics(): RiskMetrics {
    return { ...this.metrics };
  }

  async getDetailedReport(): Promise<any> {
    const accounts = await storage.getAccounts();
    const account = accounts[0];
    const openPositions = await storage.getOpenPositions(account?.id);
    
    return {
      metrics: this.getMetrics(),
      positionSummary: {
        totalPositions: openPositions.length,
        totalExposure: openPositions.reduce((sum, pos) => 
          sum + parseFloat(pos.quantity || "0") * parseFloat(pos.currentPrice || "0"), 0
        ),
        unrealizedPnL: openPositions.reduce((sum, pos) => 
          sum + parseFloat(pos.unrealizedPnL || "0"), 0
        ),
      },
      dailyPerformance: this.dailyReturns.slice(-7), // Last 7 days
    };
  }
}

export const riskMonitor = new RiskMonitor();
