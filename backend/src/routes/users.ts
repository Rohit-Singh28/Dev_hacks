import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, optionalAuth } from "../middleware/auth";

const router = Router();

// ─── Get User Profile & Stats ────────────────────────────────────────

router.get(
  "/profile/:username",
  optionalAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        rating: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get total problems solved (unique ACCEPTED problems)
    const solvedProblems = await prisma.submission.findMany({
      where: { userId: user.id, verdict: "ACCEPTED" },
      select: { problemId: true },
      distinct: ["problemId"],
    });

    // Get difficulty breakdown
    const solvedProblemIds = solvedProblems.map((s) => s.problemId);
    const diffBreakdown = await prisma.problem.groupBy({
      by: ["difficulty"],
      where: { id: { in: solvedProblemIds } },
      _count: true,
    });

    const difficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    diffBreakdown.forEach((d) => {
      difficultyCounts[d.difficulty] = d._count;
    });

    // Get total submission count
    const totalSubmissions = await prisma.submission.count({
      where: { userId: user.id },
    });

    // Get accepted submission count
    const acceptedSubmissions = await prisma.submission.count({
      where: { userId: user.id, verdict: "ACCEPTED" },
    });

    // Get contests participated
    const contestsParticipated = await prisma.contestParticipant.count({
      where: { userId: user.id },
    });

    // Get recent submissions (last 10)
    const recentSubmissions = await prisma.submission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        verdict: true,
        language: true,
        createdAt: true,
        problem: { select: { title: true, slug: true, difficulty: true } },
      },
    });

    // Get language distribution
    const languageStats = await prisma.submission.groupBy({
      by: ["language"],
      where: { userId: user.id },
      _count: true,
    });

    res.json({
      user,
      stats: {
        totalSolved: solvedProblemIds.length,
        difficultyCounts,
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate:
          totalSubmissions > 0
            ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
            : 0,
        contestsParticipated,
        languageStats: languageStats.map((l) => ({
          language: l.language,
          count: l._count,
        })),
      },
      recentSubmissions,
    });
  },
);

// ─── Get Streak Data ─────────────────────────────────────────────────

router.get(
  "/streak",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    // Get all daily activities, ordered by date descending
    const activities = await prisma.dailyActivity.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if user was active today or yesterday (to allow "ongoing" streak)
    if (activities.length > 0) {
      const latestDate = new Date(activities[0].date);
      latestDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays <= 1) {
        // Active today or yesterday — streak is alive
        currentStreak = 1;
        for (let i = 1; i < activities.length; i++) {
          const prevDate = new Date(activities[i - 1].date);
          const currDate = new Date(activities[i].date);
          prevDate.setHours(0, 0, 0, 0);
          currDate.setHours(0, 0, 0, 0);

          const gap = Math.floor(
            (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (gap === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Calculate longest streak from all activities
    if (activities.length > 0) {
      // Sort ascending for longest streak calculation
      const sorted = [...activities].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      tempStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(sorted[i - 1].date);
        const currDate = new Date(sorted[i].date);
        prevDate.setHours(0, 0, 0, 0);
        currDate.setHours(0, 0, 0, 0);

        const gap = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (gap === 1) {
          tempStreak++;
        } else if (gap > 1) {
          tempStreak = 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }
    }

    // Get total active days
    const totalActiveDays = activities.length;

    // Get activity heatmap data (last 365 days)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);

    const heatmapData = activities
      .filter((a) => new Date(a.date) >= oneYearAgo)
      .map((a) => ({
        date: a.date,
        count: a.solvedCount,
        submissions: a.submissionCount,
      }));

    res.json({
      currentStreak,
      longestStreak,
      totalActiveDays,
      heatmap: heatmapData,
    });
  },
);

// ─── Record Daily Activity (internal helper, called after submissions) ─

router.post(
  "/activity",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const solved = req.body.solved ? 1 : 0;

    await prisma.dailyActivity.upsert({
      where: { userId_date: { userId, date: today } },
      update: {
        submissionCount: { increment: 1 },
        solvedCount: { increment: solved },
      },
      create: {
        userId,
        date: today,
        submissionCount: 1,
        solvedCount: solved,
      },
    });

    res.json({ recorded: true });
  },
);

// ─── Get Solved Problem IDs ──────────────────────────────────────────

router.get(
  "/solved",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const solved = await prisma.submission.findMany({
      where: { userId, verdict: "ACCEPTED" },
      select: { problemId: true },
      distinct: ["problemId"],
    });

    res.json({ solvedProblemIds: solved.map((s) => s.problemId) });
  },
);

// ─── Get Bookmarked Problem IDs ──────────────────────────────────────

router.get(
  "/bookmarked-ids",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: { problemId: true },
    });

    res.json({ bookmarkedProblemIds: bookmarks.map((b) => b.problemId) });
  },
);

export default router;
