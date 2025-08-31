
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../db";
import { users, userSessions } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export class AuthService {
  private static readonly TOKEN_EXPIRY_HOURS = 24 * 7; // 7 days

  async register(username: string, email: string, password: string, role: string = "trader"): Promise<AuthUser> {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [user] = await db.insert(users).values({
        username,
        email,
        password: hashedPassword,
        role,
      }).returning();

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        if (error.message.includes('users.email')) {
          throw new Error('Email already exists');
        }
        if (error.message.includes('users.username')) {
          throw new Error('Username already exists');
        }
      }
      throw error;
    }
  }

  async login(username: string, password: string): Promise<{ user: AuthUser; token: string } | null> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.username, username),
        eq(users.isActive, true)
      )
    );

    if (!user || !await bcrypt.compare(password, user.password)) {
      return null;
    }

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + AuthService.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await db.insert(userSessions).values({
      userId: user.id,
      token,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  async validateToken(token: string): Promise<AuthUser | null> {
    const [session] = await db.select({
      userId: userSessions.userId,
      expiresAt: userSessions.expiresAt,
      username: users.username,
      email: users.email,
      role: users.role,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(
      and(
        eq(userSessions.token, token),
        gt(userSessions.expiresAt, new Date()),
        eq(users.isActive, true)
      )
    );

    if (!session) {
      return null;
    }

    return {
      id: session.userId,
      username: session.username,
      email: session.email,
      role: session.role,
    };
  }

  async logout(token: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.token, token));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(userSessions).where(
      and(
        gt(new Date(), userSessions.expiresAt)
      )
    );
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}

export const authService = new AuthService();
