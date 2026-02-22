import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { validate } from "../middleware/validate";

const router = Router();

// ─── Hardcoded Admin Credentials ─────────────────────────────────────
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin123";

// ─── Admin Auth Middleware ───────────────────────────────────────────

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwt.secret) as any;
    if (!payload.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token" });
  }
}

// ─── Schemas ─────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const contestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  startTime: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  endTime: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
});

const addProblemsSchema = z.object({
  problems: z
    .array(
      z.object({
        problemId: z.string().uuid(),
        label: z.string().min(1).max(5),
        points: z.number().int().min(1).default(100),
      }),
    )
    .min(1),
});

// ─── Helper: slug from title ─────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Admin Login ─────────────────────────────────────────────────────

router.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const token = jwt.sign({ isAdmin: true }, config.jwt.secret, {
      expiresIn: "24h",
    });

    res.json({ token, message: "Admin login successful" });
  },
);

// ─── List All Problems (for admin to pick from) ─────────────────────

router.get(
  "/problems",
  adminAuth,
  async (_req: Request, res: Response): Promise<void> => {
    const problems = await prisma.problem.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
      },
    });
    res.json({ problems });
  },
);

// ─── List Contests (admin) ───────────────────────────────────────────

router.get(
  "/contests",
  adminAuth,
  async (_req: Request, res: Response): Promise<void> => {
    const contests = await prisma.contest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contestProblems: {
          orderBy: { orderIdx: "asc" },
          include: {
            problem: {
              select: { id: true, title: true, slug: true, difficulty: true },
            },
          },
        },
        _count: { select: { contestParticipants: true } },
      },
    });
    res.json({ contests });
  },
);

// ─── Create Contest ──────────────────────────────────────────────────

router.post(
  "/contests",
  adminAuth,
  validate(contestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { title, description, startTime, endTime } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      res.status(400).json({ error: "End time must be after start time" });
      return;
    }

    const slug = slugify(title) + "-" + Date.now().toString(36);

    // Determine initial status
    const now = new Date();
    let status: "UPCOMING" | "ACTIVE" | "ENDED" = "UPCOMING";
    if (now >= start && now <= end) status = "ACTIVE";
    else if (now > end) status = "ENDED";

    const contest = await prisma.contest.create({
      data: {
        title,
        slug,
        description: description || null,
        startTime: start,
        endTime: end,
        status,
      },
      include: {
        contestProblems: {
          orderBy: { orderIdx: "asc" },
          include: {
            problem: {
              select: { id: true, title: true, slug: true, difficulty: true },
            },
          },
        },
        _count: { select: { contestParticipants: true } },
      },
    });

    res.status(201).json({ contest });
  },
);

// ─── Update Contest ──────────────────────────────────────────────────

router.put(
  "/contests/:id",
  adminAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const existing = await prisma.contest.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Contest not found" });
      return;
    }

    const data: any = {};
    if (req.body.title !== undefined) {
      data.title = req.body.title;
      data.slug = slugify(req.body.title) + "-" + Date.now().toString(36);
    }
    if (req.body.description !== undefined)
      data.description = req.body.description;
    if (req.body.startTime !== undefined)
      data.startTime = new Date(req.body.startTime);
    if (req.body.endTime !== undefined)
      data.endTime = new Date(req.body.endTime);

    const contest = await prisma.contest.update({
      where: { id },
      data,
      include: {
        contestProblems: {
          orderBy: { orderIdx: "asc" },
          include: {
            problem: {
              select: { id: true, title: true, slug: true, difficulty: true },
            },
          },
        },
        _count: { select: { contestParticipants: true } },
      },
    });

    res.json({ contest });
  },
);

// ─── Delete Contest ──────────────────────────────────────────────────

router.delete(
  "/contests/:id",
  adminAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const existing = await prisma.contest.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Contest not found" });
      return;
    }

    await prisma.contest.delete({ where: { id } });
    res.json({ message: "Contest deleted" });
  },
);

// ─── Add Problems to Contest ─────────────────────────────────────────

router.post(
  "/contests/:id/problems",
  adminAuth,
  validate(addProblemsSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { problems } = req.body;

    const existing = await prisma.contest.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Contest not found" });
      return;
    }

    // Remove existing problems for this contest first
    await prisma.contestProblem.deleteMany({ where: { contestId: id } });

    // Add new problems
    const data = problems.map((p: any, idx: number) => ({
      contestId: id,
      problemId: p.problemId,
      label: p.label.toUpperCase(),
      points: p.points || 100,
      orderIdx: idx,
    }));

    await prisma.contestProblem.createMany({ data });

    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        contestProblems: {
          orderBy: { orderIdx: "asc" },
          include: {
            problem: {
              select: { id: true, title: true, slug: true, difficulty: true },
            },
          },
        },
        _count: { select: { contestParticipants: true } },
      },
    });

    res.json({ contest });
  },
);

// ─── Remove a Problem from Contest ───────────────────────────────────

router.delete(
  "/contests/:id/problems/:problemId",
  adminAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { id, problemId } = req.params;

    const cp = await prisma.contestProblem.findUnique({
      where: { contestId_problemId: { contestId: id, problemId } },
    });

    if (!cp) {
      res.status(404).json({ error: "Problem not found in this contest" });
      return;
    }

    await prisma.contestProblem.delete({ where: { id: cp.id } });
    res.json({ message: "Problem removed from contest" });
  },
);

export default router;
