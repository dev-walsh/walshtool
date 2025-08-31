import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authService } from "./auth";
import { sql } from "drizzle-orm";
import { marketDataService } from "./market-data";
import { strategyEngine } from "./strategy-engine";
import { performanceTracker } from "./performance-tracker";
import { telegramBot } from "./telegram-bot";
import { mt5Integration } from "./mt5-integration";
import { aiTradingEngine } from "./ai-trading-engine";

export class StartupService {
  async initialize(): Promise<void> {
    await this.initializeDatabase();
    await this.createDefaultAdmin();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      console.log("🗄️  Initializing database...");

      // Create tables if they don't exist
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'trader',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER DEFAULT (unixepoch())
        );
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
          user_id TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          expires_at INTEGER NOT NULL,
          created_at INTEGER DEFAULT (unixepoch()),
          FOREIGN KEY (user_id) REFERENCES users (id)
        );
      `);

      // Create other essential tables
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
          user_id TEXT NOT NULL,
          broker_id TEXT NOT NULL,
          account_number TEXT NOT NULL,
          mode TEXT NOT NULL DEFAULT 'paper',
          base_currency TEXT NOT NULL DEFAULT 'USD',
          leverage REAL NOT NULL DEFAULT 100,
          balance REAL NOT NULL DEFAULT 0,
          equity REAL NOT NULL DEFAULT 0,
          prop_rules TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER DEFAULT (unixepoch()),
          FOREIGN KEY (user_id) REFERENCES users (id)
        );
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS strategies (
          id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          version TEXT NOT NULL DEFAULT '1.0.0',
          description TEXT,
          parameters TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'STOPPED',
          risk_profile TEXT,
          symbols TEXT NOT NULL,
          is_enabled INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER DEFAULT (unixepoch()),
          updated_at INTEGER DEFAULT (unixepoch()),
          FOREIGN KEY (user_id) REFERENCES users (id)
        );
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
          account_id TEXT NOT NULL,
          strategy_id TEXT,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL,
          quantity REAL NOT NULL,
          type TEXT NOT NULL,
          price REAL,
          stop_loss REAL,
          take_profit REAL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          broker_order_id TEXT,
          idempotency_key TEXT NOT NULL,
          filled_quantity REAL DEFAULT 0,
          avg_fill_price REAL,
          commission REAL,
          slippage REAL,
          created_at INTEGER DEFAULT (unixepoch()),
          filled_at INTEGER,
          FOREIGN KEY (account_id) REFERENCES accounts (id),
          FOREIGN KEY (strategy_id) REFERENCES strategies (id)
        );
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS positions (
          id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
          account_id TEXT NOT NULL,
          strategy_id TEXT,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL,
          quantity REAL NOT NULL,
          avg_price REAL NOT NULL,
          current_price REAL,
          unrealized_pnl REAL DEFAULT 0,
          realized_pnl REAL DEFAULT 0,
          stop_loss REAL,
          take_profit REAL,
          is_open INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER DEFAULT (unixepoch()),
          closed_at INTEGER,
          FOREIGN KEY (account_id) REFERENCES accounts (id),
          FOREIGN KEY (strategy_id) REFERENCES strategies (id)
        );
      `);

      console.log("✅ Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  private async createDefaultAdmin(): Promise<void> {
    try {
      console.log("👤 Creating default admin user...");

      // Check if admin user already exists
      const existingAdmin = await db.select()
        .from(users)
        .where(eq(users.username, 'admin'))
        .limit(1);

      if (existingAdmin.length === 0) {
        // Create default admin user
        await authService.register('admin', 'admin@forex-bot.com', 'admin123', 'admin');
        console.log("✅ Default admin user created (username: admin, password: admin123)");
      } else {
        console.log("✅ Admin user already exists");
      }
    } catch (error) {
      console.error("❌ Failed to create default admin user:", error);
    }
  }

  async startServices(): Promise<void> {
    // Start all services
    await marketDataService.start();
    await strategyEngine.start();
    await performanceTracker.start();
    await telegramBot.start();

    // Initialize MT5 integration
    const mt5Connected = await mt5Integration.initialize();
    if (mt5Connected) {
      console.log("✅ MT5 integration initialized");

      // Initialize AI trading engine
      const aiInitialized = await aiTradingEngine.initialize();
      if (aiInitialized) {
        console.log("✅ AI Trading Engine ready");
      }
    } else {
      console.log("⚠️ MT5 integration failed - using mock data");
    }
  }
}

export const startupService = new StartupService();