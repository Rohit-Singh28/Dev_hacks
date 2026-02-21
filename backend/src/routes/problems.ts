import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { optionalAuth } from "../middleware/auth";

const router = Router();

// ─── List Problems ───────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(String(req.query.limit ?? "20"))),
  );
  const difficulty = req.query.difficulty
    ? String(req.query.difficulty)
    : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;
  const topicSlug = req.query.topic ? String(req.query.topic) : undefined;

  const where: any = {};
  if (difficulty && ["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
    where.difficulty = difficulty;
  }
  if (topicSlug) {
    where.topic = { slug: topicSlug };
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        timeLimit: true,
        memoryLimit: true,
        topic: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.problem.count({ where }),
  ]);

  res.json({
    problems,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─── Get All Topics ─────────────────────────────────────────────────

router.get("/topics/all", async (req: Request, res: Response): Promise<void> => {
  const topics = await prisma.topic.findMany({
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      color: true,
      _count: { select: { problems: true } },
    },
  });

  res.json({ topics });
});

// ─── Get Problem by Slug ─────────────────────────────────────────────

router.get(
  "/:slug",
  optionalAuth,
  async (req: Request, res: Response): Promise<void> => {
    const problem = await prisma.problem.findUnique({
      where: { slug: String(req.params.slug) },
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
        // Only fetch visible test cases — NEVER expose hidden ones via API
        testCases: {
          where: { isHidden: false },
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            input: true,
            output: true,
            orderIndex: true,
          },
        },
        hints: {
          orderBy: { orderIdx: "asc" },
          select: {
            id: true,
            content: true,
            orderIdx: true,
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    // If user is logged in, get their submission history for this problem
    let userSubmissions: any[] = [];
    if (req.user) {
      userSubmissions = await prisma.submission.findMany({
        where: { userId: req.user.userId, problemId: problem.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          language: true,
          verdict: true,
          executionTime: true,
          memoryUsed: true,
          testsPassed: true,
          testsTotal: true,
          createdAt: true,
        },
      });
    }

    res.json({ problem, userSubmissions });
  },
);

export default router;
