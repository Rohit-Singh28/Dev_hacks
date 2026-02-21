import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  joinDuelQueue,
  leaveDuelQueue,
  getQueueStatus,
  getUserQueueStatus,
} from "../services/duelMatchmaking";
import {
  submitDuelCode,
  checkDuelCompletion,
  endDuel,
  getDuel,
  getUserActiveDuel,
  forfeitDuel,
} from "../services/duelJudge";
import { getUserRatingStats } from "../services/ratingCalculator";
import { prisma } from "../lib/prisma";

const router = Router();

// All duel routes require authentication
router.use(authMiddleware);

// ─── Schemas ─────────────────────────────────────────────────────────

const joinQueueSchema = z.object({
  timerOption: z.enum(["TEN_MINS", "THIRTY_MINS", "ONE_HOUR"]),
});

const submitDuelCodeSchema = z.object({
  duelId: z.string().uuid(),
  problemId: z.string().uuid(),
  language: z.enum(["CPP", "PYTHON", "JAVA"]),
  sourceCode: z.string().min(1).max(100_000),
});

// ─── Queue Management ────────────────────────────────────────────────

/**
 * POST /api/duels/queue/join
 * Join duel queue with selected timer
 */
router.post(
  "/queue/join",
  validate(joinQueueSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { timerOption } = req.body;
      const userId = req.user!.userId;

      // Check if already in a duel
      const activeDuel = await getUserActiveDuel(userId);
      if (activeDuel) {
        res.status(400).json({ error: "Already in an active duel" });
        return;
      }

      // Check if already in queue
      const queueStatus = await getUserQueueStatus(userId);
      if (queueStatus) {
        res.status(400).json({ error: "Already in duel queue" });
        return;
      }

      const result = await joinDuelQueue(userId, timerOption);

      res.status(200).json({
        matched: result.matched,
        ...(result.matched && {
          duelId: result.duelId,
          opponent: result.opponent,
          problems: result.problems,
        }),
      });
    } catch (error) {
      console.error("Error joining duel queue:", error);
      res.status(500).json({ error: "Failed to join duel queue" });
    }
  }
);

/**
 * POST /api/duels/queue/leave
 * Leave duel queue
 */
router.post(
  "/queue/leave",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      await leaveDuelQueue(userId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error leaving duel queue:", error);
      res.status(500).json({ error: "Failed to leave duel queue" });
    }
  }
);

/**
 * GET /api/duels/queue/status
 * Get queue status for all timer options
 */
router.get(
  "/queue/status",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const statuses = await Promise.all([
        getQueueStatus("TEN_MINS"),
        getQueueStatus("THIRTY_MINS"),
        getQueueStatus("ONE_HOUR"),
      ]);

      res.status(200).json({
        TEN_MINS: statuses[0],
        THIRTY_MINS: statuses[1],
        ONE_HOUR: statuses[2],
      });
    } catch (error) {
      console.error("Error getting queue status:", error);
      res.status(500).json({ error: "Failed to get queue status" });
    }
  }
);

/**
 * GET /api/duels/queue/user-status
 * Get current user's queue status
 */
router.get(
  "/queue/user-status",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const queueStatus = await getUserQueueStatus(userId);
      res.status(200).json(queueStatus || null);
    } catch (error) {
      console.error("Error getting user queue status:", error);
      res.status(500).json({ error: "Failed to get queue status" });
    }
  }
);

// ─── Submissions ─────────────────────────────────────────────────────

/**
 * POST /api/duels/:duelId/submit
 * Submit code for a specific problem in a duel
 */
router.post(
  "/:duelId/submit",
  validate(submitDuelCodeSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { duelId, problemId, language, sourceCode } = req.body;
      const userId = req.user!.userId;

      const submissionResult = await submitDuelCode(duelId, userId, problemId, language, sourceCode);

      // Check if duel is complete (someone solved all problems)
      const completed = await checkDuelCompletion(duelId);
      if (completed) {
        const result = await endDuel(duelId);
        res.status(200).json({
          submissionQueued: true,
          submissionId: submissionResult.submissionId,
          duelComplete: true,
          result: {
            status: result.status,
            participants: result.participants.map((p: any) => ({
              userId: p.user.id,
              username: p.user.username,
              isWinner: p.isWinner,
              ratingBefore: p.ratingBefore,
              ratingAfter: p.ratingAfter,
              submissions: p.submissions,
            })),
          },
        });
      } else {
        res.status(202).json({
          submissionQueued: true,
          submissionId: submissionResult.submissionId,
          duelComplete: false,
        });
      }
    } catch (error: any) {
      console.error("Error submitting duel code:", error);
      res.status(400).json({ error: error.message || "Failed to submit code" });
    }
  }
);

/**
 * POST /api/duels/:duelId/end
 * End a duel (called when time expires)
 */
router.post(
  "/:duelId/end",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const duelId = Array.isArray(req.params.duelId) ? req.params.duelId[0] : req.params.duelId;
      const userId = req.user!.userId;

      const duel = await getDuel(duelId);
      if (!duel) {
        res.status(404).json({ error: "Duel not found" });
        return;
      }

      const isParticipant = duel.participants.some((p: any) => p.userId === userId);
      if (!isParticipant) {
        res.status(403).json({ error: "Not authorized to end this duel" });
        return;
      }

      if (duel.status !== "IN_PROGRESS") {
        res.status(400).json({ error: "Duel is not active" });
        return;
      }

      const result = await endDuel(duelId);
      res.status(200).json({
        id: result.id,
        status: result.status,
        participants: result.participants.map((p: any) => ({
          userId: p.user.id,
          username: p.user.username,
          isWinner: p.isWinner,
          ratingBefore: p.ratingBefore,
          ratingAfter: p.ratingAfter,
          submissions: p.submissions,
        })),
      });
    } catch (error: any) {
      console.error("Error ending duel:", error);
      res.status(400).json({ error: error.message || "Failed to end duel" });
    }
  }
);

/**
 * POST /api/duels/:duelId/forfeit
 * Forfeit (quit) a duel — opponent wins automatically
 */
router.post(
  "/:duelId/forfeit",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const duelId = Array.isArray(req.params.duelId) ? req.params.duelId[0] : req.params.duelId;
      const userId = req.user!.userId;

      const duel = await getDuel(duelId);
      if (!duel) {
        res.status(404).json({ error: "Duel not found" });
        return;
      }

      const isParticipant = duel.participants.some((p: any) => p.userId === userId);
      if (!isParticipant) {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      if (duel.status !== "IN_PROGRESS") {
        res.status(400).json({ error: "Duel is not active" });
        return;
      }

      const result = await forfeitDuel(duelId, userId);
      res.status(200).json({
        id: result.id,
        status: result.status,
        forfeited: true,
        forfeitedBy: userId,
        participants: result.participants.map((p: any) => ({
          userId: p.user.id,
          username: p.user.username,
          isWinner: p.isWinner,
          ratingBefore: p.ratingBefore,
          ratingAfter: p.ratingAfter,
          submissions: p.submissions,
        })),
      });
    } catch (error: any) {
      console.error("Error forfeiting duel:", error);
      res.status(400).json({ error: error.message || "Failed to forfeit duel" });
    }
  }
);

// ─── Active Duel & Stats ─────────────────────────────────────────────

/**
 * GET /api/duels/active/current
 * Get current user's active duel
 */
router.get(
  "/active/current",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const duel = await getUserActiveDuel(userId);
      if (!duel) {
        res.status(404).json({ error: "No active duel" });
        return;
      }

      res.status(200).json({
        id: duel.id,
        status: duel.status,
        problems: duel.problems.map((dp: any) => ({
          id: dp.problem.id,
          title: dp.problem.title,
          difficulty: dp.problem.difficulty,
          label: dp.label,
        })),
        participants: duel.participants.map((p: any) => ({
          userId: p.user.id,
          username: p.user.username,
        })),
      });
    } catch (error) {
      console.error("Error getting active duel:", error);
      res.status(500).json({ error: "Failed to get active duel" });
    }
  }
);

// ─── Statistics ──────────────────────────────────────────────────────

/**
 * GET /api/duels/stats/my-stats
 */
router.get(
  "/stats/my-stats",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const stats = await getUserRatingStats(userId);
      res.status(200).json(stats);
    } catch (error) {
      console.error("Error getting user stats:", error);
      res.status(500).json({ error: "Failed to get user statistics" });
    }
  }
);

/**
 * GET /api/duels/leaderboard
 */
router.get(
  "/leaderboard",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const topPlayers = await prisma.user.findMany({
        select: { id: true, username: true, rating: true, createdAt: true },
        orderBy: { rating: "desc" },
        take: 100,
      });

      const leaderboard = await Promise.all(
        topPlayers.map(async (player) => {
          const stats = await getUserRatingStats(player.id);
          return {
            ...player,
            duelStats: {
              totalDuels: stats.totalDuels,
              wins: stats.wins,
              losses: stats.losses,
              draws: stats.draws,
              winRate: stats.winRate,
            },
          };
        })
      );

      res.status(200).json(leaderboard);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  }
);

// ─── History ─────────────────────────────────────────────────────────

/**
 * GET /api/duels/history
 */
router.get(
  "/history",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
      const skip = (page - 1) * limit;

      const duels = await prisma.duel.findMany({
        where: {
          participants: { some: { userId } },
        },
        include: {
          problems: {
            include: {
              problem: { select: { id: true, title: true, difficulty: true } },
            },
            orderBy: { orderIdx: "asc" },
          },
          participants: {
            include: {
              user: { select: { id: true, username: true } },
              submissions: {
                include: {
                  submission: {
                    select: { verdict: true, testsPassed: true, testsTotal: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      });

      const total = await prisma.duel.count({
        where: { participants: { some: { userId } } },
      });

      res.status(200).json({
        duels: duels.map((d) => ({
          id: d.id,
          status: d.status,
          problems: d.problems.map((dp) => ({
            id: dp.problem.id,
            title: dp.problem.title,
            difficulty: dp.problem.difficulty,
            label: dp.label,
          })),
          timerOption: d.timerOption,
          startedAt: d.startedAt,
          endedAt: d.endedAt,
          participants: d.participants.map((p) => ({
            userId: p.user.id,
            username: p.user.username,
            isWinner: p.isWinner,
            submissions: p.submissions,
          })),
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("Error getting duel history:", error);
      res.status(500).json({ error: "Failed to get duel history" });
    }
  }
);

// ─── Duel Details ────────────────────────────────────────────────────
// NOTE: This catch-all route MUST be defined AFTER all named routes

/**
 * GET /api/duels/:duelId
 * Get duel details
 */
router.get(
  "/:duelId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const duelId = Array.isArray(req.params.duelId) ? req.params.duelId[0] : req.params.duelId;
      const userId = req.user!.userId;

      const duel = await getDuel(duelId);
      if (!duel) {
        res.status(404).json({ error: "Duel not found" });
        return;
      }

      const isParticipant = duel.participants.some(
        (p: any) => p.userId === userId
      );
      if (!isParticipant) {
        res.status(403).json({ error: "Not authorized to view this duel" });
        return;
      }

      res.status(200).json({
        id: duel.id,
        status: duel.status,
        timerOption: duel.timerOption,
        startedAt: duel.startedAt,
        endedAt: duel.endedAt,
        problems: duel.problems.map((dp: any) => ({
          id: dp.problem.id,
          title: dp.problem.title,
          description: dp.problem.description,
          difficulty: dp.problem.difficulty,
          timeLimit: dp.problem.timeLimit,
          memoryLimit: dp.problem.memoryLimit,
          constraints: dp.problem.constraints,
          testCases: dp.problem.testCases,
          label: dp.label,
        })),
        participants: duel.participants.map((p: any) => ({
          userId: p.user.id,
          username: p.user.username,
          rating: p.user.rating,
          isWinner: p.isWinner,
          ratingBefore: p.ratingBefore,
          ratingAfter: p.ratingAfter,
          submissions: p.submissions.map((s: any) => ({
            problemId: s.problemId,
            solved: s.solved,
            submission: s.submission
              ? {
                id: s.submission.id,
                verdict: s.submission.verdict,
                testsPassed: s.submission.testsPassed,
                testsTotal: s.submission.testsTotal,
                executionTime: s.submission.executionTime,
                memoryUsed: s.submission.memoryUsed,
                createdAt: s.submission.createdAt,
              }
              : null,
          })),
        })),
      });
    } catch (error) {
      console.error("Error getting duel details:", error);
      res.status(500).json({ error: "Failed to get duel details" });
    }
  }
);

export default router;
