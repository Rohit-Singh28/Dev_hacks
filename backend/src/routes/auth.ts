import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { validate } from "../middleware/validate";
import { authMiddleware } from "../middleware/auth";
import { redis } from "../lib/redis";
import crypto from "crypto";

const router = Router();

// Session TTL — 24 hours (in seconds)
const SESSION_TTL = 24 * 60 * 60;

// ─── Schemas ─────────────────────────────────────────────────────────

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric and underscores only"),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Create a Redis session and return the session ID + JWT token.
 */
async function createSession(user: { id: string; username: string }) {
  const sessionId = crypto.randomUUID();
  const token = jwt.sign(
    { userId: user.id, username: user.username, sessionId },
    config.jwt.secret,
    { expiresIn: "24h" }
  );

  // Store session in Redis with TTL
  await redis.set(
    `session:${sessionId}`,
    JSON.stringify({ userId: user.id, username: user.username }),
    "EX",
    SESSION_TTL
  );

  return { sessionId, token };
}

// ─── Register ────────────────────────────────────────────────────────

router.post(
  "/register",
  validate(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { username, email, password } = req.body;

    // Check unique constraints
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      res.status(409).json({
        error:
          existing.username === username
            ? "Username already taken"
            : "Email already registered",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, passwordHash },
      select: { id: true, username: true, email: true, rating: true },
    });

    const { sessionId, token } = await createSession(user);

    // Set httpOnly session cookie (no maxAge = cleared when browser closes)
    res.cookie("session_id", sessionId, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "lax",
      path: "/",
      // No maxAge/expires — this makes it a session cookie
    });

    res.status(201).json({ user, token });
  }
);

// ─── Login ───────────────────────────────────────────────────────────

router.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { usernameOrEmail, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    });

    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const { sessionId, token } = await createSession(user);

    // Set httpOnly session cookie (no maxAge = cleared when browser closes)
    res.cookie("session_id", sessionId, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "lax",
      path: "/",
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
      },
      token,
    });
  }
);

// ─── Logout ──────────────────────────────────────────────────────────

router.post(
  "/logout",
  async (req: Request, res: Response): Promise<void> => {
    // Delete Redis session
    const sessionId = req.cookies?.session_id;
    if (sessionId) {
      await redis.del(`session:${sessionId}`);
    }

    // Also try to extract sessionId from JWT in Authorization header
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(header.slice(7), config.jwt.secret) as any;
        if (payload.sessionId) {
          await redis.del(`session:${payload.sessionId}`);
        }
      } catch {
        // Token expired or invalid — that's fine during logout
      }
    }

    // Clear session cookie
    res.clearCookie("session_id", {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "lax",
      path: "/",
    });

    res.json({ success: true });
  }
);

// ─── Get Current User ────────────────────────────────────────────────

router.get(
  "/me",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, username: true, email: true, rating: true, avatarUrl: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user });
  }
);

// ─── Google OAuth ────────────────────────────────────────────────────

const googleSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  googleId: z.string(),
  image: z.string().optional(),
});

router.post(
  "/google",
  validate(googleSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { email, name, googleId, image } = req.body;

    // Check if user exists by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      // Update googleId if user exists by email but doesn't have googleId
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatarUrl: image || user.avatarUrl },
        });
      }
    } else {
      // Create new user
      // Generate a unique username from name or email
      const baseUsername = (name || email.split("@")[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .slice(0, 20);

      let username = baseUsername;
      let suffix = 1;

      // Check for username uniqueness
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      user = await prisma.user.create({
        data: {
          email,
          username,
          googleId,
          avatarUrl: image,
          passwordHash: null, // No password for Google users
        },
      });
    }

    const { sessionId, token } = await createSession(user);

    // Set httpOnly session cookie
    res.cookie("session_id", sessionId, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "lax",
      path: "/",
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  }
);

export default router;
