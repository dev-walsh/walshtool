import { telegramBot } from './telegram-bot';
import { storage } from '../storage';

interface NotificationRule {
  id: string;
  type: 'alert' | 'trade' | 'risk';
  conditions: {
    level?: string[];
    pnlThreshold?: number;
    enabled: boolean;
  };
  channels: {
    telegram: boolean;
    web: boolean;
    email?: boolean;
  };
}

class NotificationManager {
  private rules: Map<string, NotificationRule> = new Map();

  constructor() {
    this.loadRules();
  }

  private loadRules() {
    // Default notification rules
    this.rules.set('alerts', {
      id: 'alerts',
      type: 'alert',
      conditions: { enabled: true },
      channels: { telegram: true, web: true }
    });
    
    this.rules.set('trades', {
      id: 'trades',
      type: 'trade',
      conditions: { enabled: true },
      channels: { telegram: true, web: true }
    });
    
    this.rules.set('risk', {
      id: 'risk',
      type: 'risk',
      conditions: { enabled: true },
      channels: { telegram: true, web: true }
    });
  }

  async sendNotification(type: string, message: string, data?: any, level: string = 'INFO') {
    const rule = this.rules.get(type);
    
    if (!rule || !rule.conditions.enabled) {
      console.log(`Notification rule disabled for type: ${type}`);
      return;
    }

    // Send to Telegram if configured and connected
    if (rule.channels.telegram && telegramBot.isConnected()) {
      try {
        await telegramBot.sendAlert({ 
          level: level.toUpperCase(),
          title: type.charAt(0).toUpperCase() + type.slice(1),
          message,
          createdAt: new Date().toISOString()
        });
        console.log(`✅ Telegram notification sent for ${type}: ${message}`);
      } catch (error) {
        console.error(`❌ Failed to send Telegram notification:`, error);
      }
    }

    // Store in database for web notifications
    if (rule.channels.web) {
      try {
        await storage.createAlert({
          level: level.toUpperCase(),
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
          message,
          source: "NOTIFICATION_MANAGER",
        });
        console.log(`✅ Web notification stored for ${type}: ${message}`);
      } catch (error) {
        console.error(`❌ Failed to store web notification:`, error);
      }
    }

    // Log notification
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  async sendAlert(level: string, message: string, symbol?: string) {
    const fullMessage = `🚨 ${level.toUpperCase()}: ${message}${symbol ? ` (${symbol})` : ''}`;
    await this.sendNotification('alerts', fullMessage, { level, symbol }, level);
  }

  async sendTradeNotification(action: string, symbol: string, details: any) {
    const message = `📊 ${action.toUpperCase()}: ${symbol} - Size: ${details.size || 'N/A'}, Price: ${details.price || 'N/A'}`;
    await this.sendNotification('trades', message, { action, symbol, details }, 'INFO');
    
    // Also send via Telegram bot's trade notification method
    if (telegramBot.isConnected()) {
      try {
        await telegramBot.sendTradeNotification({
          side: action.toUpperCase(),
          symbol,
          quantity: details.size || details.quantity || '0',
          price: details.price || '0'
        });
      } catch (error) {
        console.error(`❌ Failed to send Telegram trade notification:`, error);
      }
    }
  }

  async sendRiskWarning(message: string, metrics?: any) {
    const fullMessage = `⚠️ RISK WARNING: ${message}`;
    await this.sendNotification('risk', fullMessage, { metrics }, 'WARNING');
  }

  async sendSystemAlert(message: string, component?: string) {
    const fullMessage = `🔧 SYSTEM: ${message}${component ? ` (${component})` : ''}`;
    await this.sendNotification('alerts', fullMessage, { component }, 'INFO');
  }

  async sendStrategyAlert(strategyName: string, action: string, details?: any) {
    const message = `🎯 STRATEGY: ${strategyName} - ${action}`;
    await this.sendNotification('alerts', message, { strategyName, action, details }, 'INFO');
  }

  // Method to enable/disable notification rules
  updateRule(ruleId: string, updates: Partial<NotificationRule>) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.set(ruleId, { ...rule, ...updates });
      console.log(`Updated notification rule: ${ruleId}`);
    }
  }

  // Method to get current rules
  getRules(): NotificationRule[] {
    return Array.from(this.rules.values());
  }
}

export const notificationManager = new NotificationManager();