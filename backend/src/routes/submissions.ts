import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { enqueueSubmission } from "../services/submissionQueue";

const router = Router();

// All submission routes require auth
router.use(authMiddleware);

// ─── Schemas ─────────────────────────────────────────────────────────

const runCodeSchema = z.object({
  problemId: z.string().uuid(),
  language: z.enum(["CPP", "PYTHON", "JAVA"]),
  sourceCode: z.string().min(1).max(100_000), // 100KB max
  contestId: z.string().uuid().nullable().optional(),
});

const submitCodeSchema = z.object({
  problemId: z.string().uuid(),
  language: z.enum(["CPP", "PYTHON", "JAVA"]),
  sourceCode: z.string().min(1).max(100_000),
  contestId: z.string().uuid().nullable().optional(),
});

// ─── Run Code (visible test cases only) ──────────────────────────────

router.post(
  "/run",
  validate(runCodeSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { problemId, language, sourceCode, contestId } = req.body;
    const userId = req.user!.userId;

    // Verify problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });
    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    // If contest submission, verify contest is ACTIVE
    if (contestId) {
      const contestCheck = await verifyContestActive(contestId, userId);
      if (contestCheck.error) {
        res.status(contestCheck.status).json({ error: contestCheck.error });
        return;
      }
    }

    // Create submission record
    const submission = await prisma.submission.create({
      data: {
        userId,
        problemId,
        contestId: contestId || null,
        language,
        sourceCode,
        verdict: "PENDING",
        isContest: !!contestId,
      },
    });

    // Enqueue for judging — mode "run" = visible test cases only
    await enqueueSubmission({
      submissionId: submission.id,
      userId,
      problemId,
      contestId: contestId || null,
      language,
      sourceCode,
      mode: "run",
    });

    res.status(202).json({
      submissionId: submission.id,
      status: "PENDING",
      message: "Code queued for execution",
    });
  }
);

// ─── Submit Solution (all test cases) ────────────────────────────────

router.post(
  "/submit",
  validate(submitCodeSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { problemId, language, sourceCode, contestId } = req.body;
    const userId = req.user!.userId;

    // Verify problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });
    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    // If contest submission, verify contest is ACTIVE and user is registered
    if (contestId) {
      const contestCheck = await verifyContestActive(contestId, userId);
      if (contestCheck.error) {
        res.status(contestCheck.status).json({ error: contestCheck.error });
        return;
      }
    }

    // Rate limit: max 1 submit per 10 seconds per user per problem
    const recentSubmission = await prisma.submission.findFirst({
      where: {
        userId,
        problemId,
        createdAt: { gte: new Date(Date.now() - 10_000) },
      },
    });
    if (recentSubmission) {
      res
        .status(429)
        .json({ error: "Please wait 10 seconds between submissions" });
      return;
    }

    // Create submission record
    const submission = await prisma.submission.create({
      data: {
        userId,
        problemId,
        contestId: contestId || null,
        language,
        sourceCode,
        verdict: "PENDING",
        isContest: !!contestId,
      },
    });

    // Enqueue for judging — mode "submit" = ALL test cases
    await enqueueSubmission({
      submissionId: submission.id,
      userId,
      problemId,
      contestId: contestId || null,
      language,
      sourceCode,
      mode: "submit",
    });

    res.status(202).json({
      submissionId: submission.id,
      status: "PENDING",
      message: "Solution queued for judging",
    });
  }
);

// ─── Get Submission by ID ────────────────────────────────────────────

router.get(
  "/:id",
  async (req: Request, res: Response): Promise<void> => {
    const submission = await prisma.submission.findUnique({
      where: { id: String(req.params.id) },
      include: {
        problem: { select: { title: true, slug: true } },
      },
    });

    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    // Users can only view their own submissions
    if (submission.userId !== req.user!.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Fetch cached test results from Redis if available
    let testResults = null;
    try {
      const cached = await redis.get(`submission-results:${submission.id}`);
      if (cached) testResults = JSON.parse(cached);
    } catch { /* ignore */ }

    res.json({ submission: { ...submission, testResults } });
  }
);

// ─── List User's Submissions ─────────────────────────────────────────

router.get(
  "/",
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const problemId = req.query.problemId ? String(req.query.problemId) : undefined;
    const contestId = req.query.contestId ? String(req.query.contestId) : undefined;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"))));

    const where: any = { userId };
    if (problemId) where.problemId = problemId;
    if (contestId) where.contestId = contestId;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          problem: { select: { title: true, slug: true } },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    res.json({
      submissions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }
);

// ─── Helpers ─────────────────────────────────────────────────────────

async function verifyContestActive(
  contestId: string,
  userId: string
): Promise<{ error?: string; status: number }> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, status: true, startTime: true, endTime: true },
  });

  if (!contest) return { error: "Contest not found", status: 404 };

  const now = new Date();
  if (now < contest.startTime)
    return { error: "Contest has not started yet", status: 400 };
  if (now > contest.endTime)
    return { error: "Contest has ended", status: 400 };

  // Check if user is registered
  const participant = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId } },
  });
  if (!participant)
    return { error: "You are not registered for this contest", status: 403 };

  return { status: 200 };
}

export default router;
