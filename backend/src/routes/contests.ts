import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware, optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { emitScoreboardUpdate, emitContestEvent } from "../websocket";

const router = Router();

// ─── List Contests ───────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"))));

  const where: any = {};
  if (status && ["UPCOMING", "ACTIVE", "ENDED"].includes(status)) {
    where.status = status;
  }

  const [contests, total] = await Promise.all([
    prisma.contest.findMany({
      where,
      orderBy: { startTime: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { contestParticipants: true, contestProblems: true } },
      },
    }),
    prisma.contest.count({ where }),
  ]);

  res.json({
    contests,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─── Get Contest by Slug ─────────────────────────────────────────────

router.get(
  "/:slug",
  optionalAuth,
  async (req: Request, res: Response): Promise<void> => {
    const contestRaw = await prisma.contest.findUnique({
      where: { slug: String(req.params.slug) },
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

    if (!contestRaw) {
      res.status(404).json({ error: "Contest not found" });
      return;
    }

    const contest = contestRaw;

    // Check if current user is registered
    let isRegistered = false;
    if (req.user) {
      const participant = await prisma.contestParticipant.findUnique({
        where: {
          contestId_userId: { contestId: contest.id, userId: req.user.userId },
        },
      });
      isRegistered = !!participant;
    }

    // Don't expose problem details for upcoming contests unless registered
    const now = new Date();
    let problems = contest.contestProblems;
    if (contest.startTime > now && !isRegistered) {
      problems = []; // hide problems until contest starts
    }

    res.json({
      contest: { ...contest, contestProblems: problems },
      isRegistered,
      serverTime: now.toISOString(),
    });
  }
);

// ─── Register for Contest ────────────────────────────────────────────

router.post(
  "/:slug/register",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const contest = await prisma.contest.findUnique({
      where: { slug: String(req.params.slug) },
    });

    if (!contest) {
      res.status(404).json({ error: "Contest not found" });
      return;
    }

    const now = new Date();
    if (now > contest.endTime) {
      res.status(400).json({ error: "Contest has already ended" });
      return;
    }

    // Upsert — idempotent registration
    await prisma.contestParticipant.upsert({
      where: {
        contestId_userId: {
          contestId: contest.id,
          userId: req.user!.userId,
        },
      },
      update: {},
      create: {
        contestId: contest.id,
        userId: req.user!.userId,
      },
    });

    res.json({ message: "Registered successfully" });
  }
);

// ─── Get Contest Scoreboard ──────────────────────────────────────────

router.get(
  "/:slug/scoreboard",
  async (req: Request, res: Response): Promise<void> => {
    const contest = await prisma.contest.findUnique({
      where: { slug: String(req.params.slug) },
      select: { id: true, startTime: true, endTime: true, status: true },
    });

    if (!contest) {
      res.status(404).json({ error: "Contest not found" });
      return;
    }

    // Get all participants sorted by score desc, penalty asc
    const participants = await prisma.contestParticipant.findMany({
      where: { contestId: contest.id },
      orderBy: [{ score: "desc" }, { penalty: "asc" }],
      include: {
        user: { select: { id: true, username: true, rating: true } },
      },
    });

    // Get all contest problems
    const contestProblems = await prisma.contestProblem.findMany({
      where: { contestId: contest.id },
      orderBy: { orderIdx: "asc" },
      select: { id: true, label: true, problemId: true, points: true },
    });

    // For each participant, get per-problem AC status
    // Batch query: get all accepted submissions for this contest
    const acceptedSubmissions = await prisma.submission.findMany({
      where: {
        contestId: contest.id,
        verdict: "ACCEPTED",
      },
      distinct: ["userId", "problemId"],
      select: { userId: true, problemId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Build lookup: userId → Set of solved problemIds
    const solvedMap = new Map<string, Set<string>>();
    for (const sub of acceptedSubmissions) {
      if (!solvedMap.has(sub.userId)) solvedMap.set(sub.userId, new Set());
      solvedMap.get(sub.userId)!.add(sub.problemId);
    }

    // Build scoreboard rows
    const scoreboard = participants.map((p, idx) => ({
      rank: idx + 1,
      user: p.user,
      score: p.score,
      penalty: p.penalty,
      solvedProblems: contestProblems.map((cp) => ({
        label: cp.label,
        problemId: cp.problemId,
        solved: solvedMap.get(p.userId)?.has(cp.problemId) ?? false,
      })),
    }));

    res.json({
      contestId: contest.id,
      problems: contestProblems,
      scoreboard,
      serverTime: new Date().toISOString(),
    });
  }
);

// ─── Get Contest Problem ─────────────────────────────────────────────

router.get(
  "/:slug/problems/:label",
  optionalAuth,
  async (req: Request, res: Response): Promise<void> => {
    const contest = await prisma.contest.findUnique({
      where: { slug: String(req.params.slug) },
    });

    if (!contest) {
      res.status(404).json({ error: "Contest not found" });
      return;
    }

    const now = new Date();
    if (now < contest.startTime) {
      res.status(400).json({ error: "Contest has not started yet" });
      return;
    }

    const contestProblem = await prisma.contestProblem.findUnique({
      where: {
        contestId_label: {
          contestId: contest.id,
          label: String(req.params.label).toUpperCase(),
        },
      },
      include: {
        problem: {
          include: {
            testCases: {
              where: { isHidden: false },
              orderBy: { orderIndex: "asc" },
              select: { id: true, input: true, output: true, orderIndex: true },
            },
          },
        },
      },
    });

    if (!contestProblem) {
      res.status(404).json({ error: "Problem not found in this contest" });
      return;
    }

    res.json({
      contestProblem,
      contestId: contest.id,
      serverTime: now.toISOString(),
    });
  }
);

export default router;
