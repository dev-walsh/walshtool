import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";

// Use SQLite for development
const dbPath = path.join(process.cwd(), "trading_bot.db");
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite);