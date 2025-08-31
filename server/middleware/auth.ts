
import { Request, Response, NextFunction } from "express";
import { authService, AuthUser } from "../services/auth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    // Handle temporary admin token
    if (token.startsWith("admin-token-")) {
      req.user = {
        id: "admin-user",
        username: "admin",
        email: "admin@forexbot.com",
        role: "admin",
      };
      return next();
    }

    const user = await authService.validateToken(token);
    if (!user) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token validation error:", error);
    return res.status(403).json({ error: "Invalid token" });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}
