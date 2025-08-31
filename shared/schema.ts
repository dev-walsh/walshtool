import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("trader"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// User Sessions
export const userSessions = sqliteTable("user_sessions", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Accounts
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  userId: text("user_id").notNull().references(() => users.id),
  brokerId: text("broker_id").notNull(),
  accountNumber: text("account_number").notNull(),
  mode: text("mode").notNull().default("paper"), // live, paper, backtest
  baseCurrency: text("base_currency").notNull().default("USD"),
  leverage: real("leverage").notNull().default(100),
  balance: real("balance").notNull().default(0),
  equity: real("equity").notNull().default(0),
  propRules: text("prop_rules"), // JSON string for prop firm rules
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Strategies
export const strategies = sqliteTable("strategies", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0.0"),
  description: text("description"),
  parameters: text("parameters").notNull(), // JSON string for strategy configuration
  status: text("status").notNull().default("STOPPED"), // RUNNING, PAUSED, STOPPED, ERROR
  riskProfile: text("risk_profile"), // JSON string for risk parameters
  symbols: text("symbols").notNull(), // JSON array as string
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Orders
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  accountId: text("account_id").notNull().references(() => accounts.id),
  strategyId: text("strategy_id").references(() => strategies.id),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // BUY, SELL
  quantity: real("quantity").notNull(),
  type: text("type").notNull(), // MARKET, LIMIT, STOP, STOP_LIMIT
  price: real("price"),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  status: text("status").notNull().default("PENDING"), // PENDING, FILLED, CANCELLED, REJECTED, PARTIAL
  brokerOrderId: text("broker_order_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  filledQuantity: real("filled_quantity").default(0),
  avgFillPrice: real("avg_fill_price"),
  commission: real("commission"),
  slippage: real("slippage"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  filledAt: integer("filled_at", { mode: "timestamp" }),
});

// Positions
export const positions = sqliteTable("positions", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  accountId: text("account_id").notNull().references(() => accounts.id),
  strategyId: text("strategy_id").references(() => strategies.id),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // BUY, SELL
  quantity: real("quantity").notNull(),
  avgPrice: real("avg_price").notNull(),
  currentPrice: real("current_price"),
  unrealizedPnL: real("unrealized_pnl").default(0),
  realizedPnL: real("realized_pnl").default(0),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  isOpen: integer("is_open", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  closedAt: integer("closed_at", { mode: "timestamp" }),
});

// Risk Events
export const riskEvents = sqliteTable("risk_events", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  accountId: text("account_id").notNull().references(() => accounts.id),
  strategyId: text("strategy_id").references(() => strategies.id),
  level: text("level").notNull(), // INFO, WARNING, CRITICAL
  rule: text("rule").notNull(),
  action: text("action").notNull(),
  details: text("details"), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Backtests
export const backtests = sqliteTable("backtests", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  strategyId: text("strategy_id").notNull().references(() => strategies.id),
  name: text("name").notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  parameters: text("parameters").notNull(), // JSON string
  metrics: text("metrics"), // JSON string for performance metrics
  status: text("status").notNull().default("PENDING"),
  artifactUri: text("artifact_uri"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// Alerts
export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  level: text("level").notNull(), // INFO, WARNING, CRITICAL
  title: text("title").notNull(),
  message: text("message").notNull(),
  source: text("source"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// System Status
export const systemStatus = sqliteTable("system_status", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  service: text("service").notNull(),
  status: text("status").notNull(),
  latency: integer("latency"),
  metadata: text("metadata"), // JSON string
  lastUpdate: integer("last_update", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Relations
export const accountsRelations = relations(accounts, ({ many }) => ({
  orders: many(orders),
  positions: many(positions),
  riskEvents: many(riskEvents),
}));

export const strategiesRelations = relations(strategies, ({ many }) => ({
  orders: many(orders),
  positions: many(positions),
  riskEvents: many(riskEvents),
  backtests: many(backtests),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  account: one(accounts, {
    fields: [orders.accountId],
    references: [accounts.id],
  }),
  strategy: one(strategies, {
    fields: [orders.strategyId],
    references: [strategies.id],
  }),
}));

export const positionsRelations = relations(positions, ({ one }) => ({
  account: one(accounts, {
    fields: [positions.accountId],
    references: [accounts.id],
  }),
  strategy: one(strategies, {
    fields: [positions.strategyId],
    references: [strategies.id],
  }),
}));

export const riskEventsRelations = relations(riskEvents, ({ one }) => ({
  account: one(accounts, {
    fields: [riskEvents.accountId],
    references: [accounts.id],
  }),
  strategy: one(strategies, {
    fields: [riskEvents.strategyId],
    references: [strategies.id],
  }),
}));

export const backtestsRelations = relations(backtests, ({ one }) => ({
  strategy: one(strategies, {
    fields: [backtests.strategyId],
    references: [strategies.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  strategies: many(strategies),
  sessions: many(userSessions),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true });
export const insertStrategySchema = createInsertSchema(strategies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, filledAt: true });
export const insertPositionSchema = createInsertSchema(positions).omit({ id: true, createdAt: true, closedAt: true });
export const insertRiskEventSchema = createInsertSchema(riskEvents).omit({ id: true, createdAt: true });
export const insertBacktestSchema = createInsertSchema(backtests).omit({ id: true, createdAt: true, completedAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });
export const insertSystemStatusSchema = createInsertSchema(systemStatus).omit({ id: true, lastUpdate: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type RiskEvent = typeof riskEvents.$inferSelect;
export type InsertRiskEvent = z.infer<typeof insertRiskEventSchema>;
export type Backtest = typeof backtests.$inferSelect;
export type InsertBacktest = z.infer<typeof insertBacktestSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type SystemStatus = typeof systemStatus.$inferSelect;
export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
