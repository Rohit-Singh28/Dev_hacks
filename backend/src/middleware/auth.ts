import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { redis } from "../lib/redis";

export interface AuthPayload {
  userId: string;
  username: string;
  sessionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;

    // Validate Redis session if sessionId is present
    if (payload.sessionId) {
      redis
        .get(`session:${payload.sessionId}`)
        .then((session) => {
          if (!session) {
            res.status(401).json({ error: "Session expired or logged out" });
            return;
          }
          req.user = payload;
          next();
        })
        .catch(() => {
          // Redis error — allow through with just JWT validation
          req.user = payload;
          next();
        });
    } else {
      // Legacy token without sessionId — still accept for backward compat
      req.user = payload;
      next();
    }
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Optional auth — sets req.user if token present, but does not block.
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(
        header.slice(7),
        config.jwt.secret
      ) as AuthPayload;
      req.user = payload;
    } catch {
      // token invalid — continue as unauthenticated
    }
  }
  next();
}
