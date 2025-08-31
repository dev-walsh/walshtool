import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';
import { storage } from '../storage';
import { riskManager } from './risk-manager';
import { orderManager } from './order-manager';
import { strategyEngine } from './strategy-engine';

interface TelegramUser {
  id: number;
  username?: string;
  isAuthorized: boolean;
  role: 'admin' | 'viewer';
}

class TelegramBotService {
  private bot: TelegramBot | null = null;
  private authorizedUsers: Map<number, TelegramUser> = new Map();
  private alertSubscriptions: Set<number> = new Set();
  private botToken: string | null = null;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    console.log('🤖 Telegram Bot Token:', this.botToken ? 'SET' : 'NOT SET');
    if (this.botToken && this.botToken.trim() !== '') {
      this.initializeBot();
    } else {
      console.log('🤖 Telegram bot disabled - no token provided or token is empty');
      console.log('   To enable Telegram bot:');
      console.log('   1. Get a bot token from @BotFather on Telegram');
      console.log('   2. Add it to your Secrets as TELEGRAM_BOT_TOKEN');
    }
  }

  private initializeBot() {
    if (!this.botToken) return;

    this.bot = new TelegramBot(this.botToken, { polling: true });
    this.setupCommands();
    this.setupMessageHandlers();
    console.log('Telegram bot initialized');
  }

  private setupCommands() {
    if (!this.bot) return;

    // Set bot commands
    this.bot.setMyCommands([
      { command: 'start', description: 'Start the bot and get authorization' },
      { command: 'status', description: 'Get account and system status' },
      { command: 'positions', description: 'View open positions' },
      { command: 'risk', description: 'Get current risk metrics' },
      { command: 'stop', description: 'Emergency stop all trading' },
      { command: 'strategies', description: 'View strategy status' },
      { command: 'alerts', description: 'Subscribe/unsubscribe to alerts' },
      { command: 'help', description: 'Show all available commands' },
    ]);
  }

  private setupMessageHandlers() {
    if (!this.bot) return;

    // Start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const user = msg.from;

      if (!user) return;

      console.log(`Telegram /start command from user ${user.id} (${user.first_name})`);

      // Auto-authorize first user as admin
      if (this.authorizedUsers.size === 0) {
        this.authorizeUser(user.id, 'admin');
        this.sendMessage(chatId, `🤖 *Forex Trading Bot*\n\nWelcome ${user.first_name}!\n\nYou have been authorized as the first admin user.\n\nUse /help to see available commands.`, { parse_mode: 'Markdown' });
      } else if (!this.isAuthorized(user.id)) {
        this.sendMessage(chatId, `🤖 *Forex Trading Bot*\n\nHello ${user.first_name}!\n\nTo access trading controls, please contact your administrator for authorization.\n\nYour User ID: \`${user.id}\``, { parse_mode: 'Markdown' });
      } else {
        this.sendMessage(chatId, `🤖 *Welcome back!*\n\nUse /help to see available commands.`, { parse_mode: 'Markdown' });
      }
    });

    // Status command
    this.bot.onText(/\/status/, async (msg) => {
      if (!this.isAuthorized(msg.from?.id)) return;

      try {
        const dashboardData = await this.getDashboardData();
        const statusMessage = this.formatStatusMessage(dashboardData);
        this.sendMessage(msg.chat.id, statusMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        this.sendMessage(msg.chat.id, '❌ Failed to fetch status data');
      }
    });

    // Positions command
    this.bot.onText(/\/positions/, async (msg) => {
      if (!this.isAuthorized(msg.from?.id)) return;

      try {
        const positions = await storage.getOpenPositions('default-account');
        const positionsMessage = this.formatPositionsMessage(positions);
        this.sendMessage(msg.chat.id, positionsMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        this.sendMessage(msg.chat.id, '❌ Failed to fetch positions');
      }
    });

    // Risk command
    this.bot.onText(/\/risk/, async (msg) => {
      if (!this.isAuthorized(msg.from?.id)) return;

      try {
        const riskStatus = await riskManager.getCurrentRiskStatus();
        const riskMessage = this.formatRiskMessage(riskStatus);
        this.sendMessage(msg.chat.id, riskMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        this.sendMessage(msg.chat.id, '❌ Failed to fetch risk status');
      }
    });

    // Emergency stop command
    this.bot.onText(/\/stop/, async (msg) => {
      if (!this.isAuthorized(msg.from?.id, 'admin')) return;

      try {
        await riskManager.emergencyStop();
        await storage.createAlert({
          level: "CRITICAL",
          title: "Emergency Stop (Telegram)",
          message: `Emergency stop triggered by ${msg.from?.first_name} via Telegram`,
          source: "TELEGRAM_BOT",
        });
        this.sendMessage(msg.chat.id, '🛑 *EMERGENCY STOP EXECUTED*\n\nAll trading has been halted.', { parse_mode: 'Markdown' });
      } catch (error) {
        this.sendMessage(msg.chat.id, '❌ Failed to execute emergency stop');
      }
    });

    // Strategies command
    this.bot.onText(/\/strategies/, async (msg) => {
      if (!this.isAuthorized(msg.from?.id)) return;

      try {
        const strategies = await storage.getStrategies();
        const strategiesMessage = this.formatStrategiesMessage(strategies);
        this.sendMessage(msg.chat.id, strategiesMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        this.sendMessage(msg.chat.id, '❌ Failed to fetch strategies');
      }
    });

    // Alerts subscription command
    this.bot.onText(/\/alerts/, (msg) => {
      if (!this.isAuthorized(msg.from?.id)) return;

      const chatId = msg.chat.id;
      if (this.alertSubscriptions.has(chatId)) {
        this.alertSubscriptions.delete(chatId);
        this.sendMessage(chatId, '🔕 Alert notifications disabled');
      } else {
        this.alertSubscriptions.add(chatId);
        this.sendMessage(chatId, '🔔 Alert notifications enabled');
      }
    });

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      if (!this.isAuthorized(msg.from?.id)) return;

      const helpMessage = `🤖 *Forex Trading Bot Commands*

📊 /status - Account & system status
📈 /positions - View open positions  
⚠️ /risk - Current risk metrics
🛑 /stop - Emergency stop trading
🎯 /strategies - Strategy overview
🔔 /alerts - Toggle alert notifications
❓ /help - Show this help

*Admin Only:*
🛑 /stop - Emergency stop all trading

Need help? Contact your administrator.`;

      this.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
    });

    // Handle WebSocket messages
    this.bot.on('message', (msg) => {
      if (!this.isAuthorized(msg.from?.id)) return;

      // Assuming messages can contain commands or data
      // For simplicity, we'll just echo back if it's not a command we handle
      if (msg.text && !msg.text.startsWith('/')) {
        // Placeholder for potential future message handling
      }
    });

    this.bot.on('polling_error', (error) => {
      console.error('Telegram Bot Polling Error:', error.code, error.message);
    });

    // Handle specific message types if needed, e.g., data updates
    this.bot.on('webhook_error', (error) => {
      console.error('Telegram Bot Webhook Error:', error.code, error.message);
    });
  }

  // Authorization methods
  async authorizeUser(userId: number, role: 'admin' | 'viewer' = 'viewer') {
    this.authorizedUsers.set(userId, {
      id: userId,
      isAuthorized: true,
      role,
    });

    this.sendMessage(userId, `✅ You have been authorized as ${role}. Use /help to see available commands.`);
  }

  private isAuthorized(userId?: number, requiredRole?: 'admin' | 'viewer'): boolean {
    if (!userId) return false;

    const user = this.authorizedUsers.get(userId);
    if (!user?.isAuthorized) return false;

    if (requiredRole === 'admin' && user.role !== 'admin') return false;

    return true;
  }

  // Message formatting methods
  private formatStatusMessage(data: any): string {
    const account = data.account;
    const riskLevel = data.risk?.level || 'Unknown';
    const equity = parseFloat(account.equity);
    const balance = parseFloat(account.balance);
    const dailyPnL = parseFloat(account.dailyPnL);
    const openPnL = parseFloat(account.openPnL);

    return `📊 *Account Status*

💰 Balance: $${balance.toLocaleString()}
📈 Equity: $${equity.toLocaleString()}
📅 Daily P&L: ${dailyPnL >= 0 ? '+' : ''}$${dailyPnL.toLocaleString()}
📊 Open P&L: ${openPnL >= 0 ? '+' : ''}$${openPnL.toLocaleString()}

⚠️ Risk Level: ${riskLevel}

🕐 Last Updated: ${new Date().toLocaleTimeString()}`;
  }

  private formatPositionsMessage(positions: any[]): string {
    if (positions.length === 0) {
      return '📊 *Open Positions*\n\nNo open positions';
    }

    let message = '📊 *Open Positions*\n\n';

    positions.forEach((pos, index) => {
      const pnl = parseFloat(pos.unrealizedPnL);
      const pnlEmoji = pnl >= 0 ? '📈' : '📉';

      message += `${pnlEmoji} *${pos.symbol}*\n`;
      message += `   Side: ${pos.side}\n`;
      message += `   Size: ${parseFloat(pos.quantity).toFixed(2)}\n`;
      message += `   P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}\n`;
      if (index < positions.length - 1) message += '\n';
    });

    return message;
  }

  private formatRiskMessage(riskData: any): string {
    return `⚠️ *Risk Status*

🎯 Daily Limit: ${riskData.dailyLossLimit || 'Not set'}
📊 Current Drawdown: ${riskData.currentDrawdown || '0%'}
🛡️ Risk Level: ${riskData.level || 'Unknown'}
🔄 Max Positions: ${riskData.maxPositions || 'Not set'}

${riskData.isLimitReached ? '🛑 Risk limits reached!' : '✅ Within limits'}`;
  }

  private formatStrategiesMessage(strategies: any[]): string {
    if (strategies.length === 0) {
      return '🎯 *Strategies*\n\nNo strategies configured';
    }

    let message = '🎯 *Active Strategies*\n\n';

    strategies.forEach((strategy, index) => {
      const statusEmoji = strategy.isEnabled ? '✅' : '❌';

      message += `${statusEmoji} *${strategy.name}*\n`;
      message += `   Status: ${strategy.status}\n`;
      message += `   Symbols: ${strategy.symbols.join(', ')}\n`;
      if (index < strategies.length - 1) message += '\n';
    });

    return message;
  }

  // Public methods for sending notifications
  async sendAlert(alert: any) {
    if (!this.bot || this.alertSubscriptions.size === 0) return;

    const emoji = this.getAlertEmoji(alert.level);
    const message = `${emoji} *${alert.title}*\n\n${alert.message}\n\n🕐 ${new Date(alert.createdAt).toLocaleTimeString()}`;

    for (const chatId of this.alertSubscriptions) {
      try {
        await this.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(`Failed to send alert to ${chatId}:`, error);
      }
    }
  }

  async sendTradeNotification(trade: any) {
    if (!this.bot || this.alertSubscriptions.size === 0) return;

    const emoji = trade.side === 'BUY' ? '📈' : '📉';
    const message = `${emoji} *Trade Executed*\n\n💱 ${trade.symbol}\n📊 ${trade.side} ${trade.quantity}\n💰 Price: ${trade.price}\n\n🕐 ${new Date().toLocaleTimeString()}`;

    for (const chatId of this.alertSubscriptions) {
      try {
        await this.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(`Failed to send trade notification to ${chatId}:`, error);
      }
    }
  }

  private getAlertEmoji(level: string): string {
    switch (level.toUpperCase()) {
      case 'CRITICAL': return '🚨';
      case 'ERROR': return '❌';
      case 'WARNING': return '⚠️';
      case 'INFO': return 'ℹ️';
      default: return '📋';
    }
  }

  private async sendMessage(chatId: number, text: string, options?: any) {
    if (!this.bot) return;

    try {
      await this.bot.sendMessage(chatId, text, options);
    } catch (error) {
      console.error('Telegram send message error:', error);
    }
  }

  private async getDashboardData() {
    // This would normally call your existing dashboard API
    return {
      account: {
        balance: "100000.00",
        equity: "102500.00",
        dailyPnL: "2500.00",
        openPnL: "1250.00"
      },
      risk: {
        level: "LOW",
        dailyLossLimit: "5000",
        currentDrawdown: "2.5%"
      }
    };
  }

  // Admin methods
  getAuthorizedUsers(): TelegramUser[] {
    return Array.from(this.authorizedUsers.values());
  }

  revokeUser(userId: number) {
    this.authorizedUsers.delete(userId);
    this.alertSubscriptions.delete(userId);
    this.sendMessage(userId, '❌ Your access has been revoked.');
  }

  isConnected(): boolean {
    return this.bot !== null;
  }
}

export const telegramBot = new TelegramBotService();