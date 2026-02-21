import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, optionalAuth } from "../middleware/auth";

const router = Router();

// ─── Roadmap Level Configuration ─────────────────────────────────────
// Each level has ONE problem to solve

interface RoadmapLevel {
  id: number;
  name: string;
  description: string;
  requiredPoints: number;
  badge: {
    name: string;
    icon: string;
    color: string;
  };
  problemDifficulty: "EASY" | "MEDIUM" | "HARD";
}

const ROADMAP_LEVELS: RoadmapLevel[] = [
  {
    id: 1,
    name: "First Steps",
    description: "Begin your coding journey",
    requiredPoints: 0,
    badge: { name: "Beginner", icon: "◆", color: "#6366F1" },
    problemDifficulty: "EASY",
  },
  {
    id: 2,
    name: "Getting Started",
    description: "Build your foundation",
    requiredPoints: 50,
    badge: { name: "Learner", icon: "◇", color: "#8B5CF6" },
    problemDifficulty: "EASY",
  },
  {
    id: 3,
    name: "Basic Logic",
    description: "Master conditionals",
    requiredPoints: 100,
    badge: { name: "Thinker", icon: "△", color: "#A855F7" },
    problemDifficulty: "EASY",
  },
  {
    id: 4,
    name: "Loop Basics",
    description: "Understand iterations",
    requiredPoints: 150,
    badge: { name: "Iterator", icon: "○", color: "#D946EF" },
    problemDifficulty: "EASY",
  },
  {
    id: 5,
    name: "Array Fundamentals",
    description: "Work with collections",
    requiredPoints: 200,
    badge: { name: "Collector", icon: "□", color: "#EC4899" },
    problemDifficulty: "EASY",
  },
  {
    id: 6,
    name: "String Operations",
    description: "Manipulate text data",
    requiredPoints: 250,
    badge: { name: "Wordsmith", icon: "▽", color: "#F43F5E" },
    problemDifficulty: "EASY",
  },
  {
    id: 7,
    name: "Problem Solving",
    description: "Apply your skills",
    requiredPoints: 300,
    badge: { name: "Solver", icon: "⬡", color: "#10B981" },
    problemDifficulty: "MEDIUM",
  },
  {
    id: 8,
    name: "Intermediate Logic",
    description: "Complex conditions",
    requiredPoints: 400,
    badge: { name: "Analyst", icon: "⬢", color: "#14B8A6" },
    problemDifficulty: "MEDIUM",
  },
  {
    id: 9,
    name: "Advanced Arrays",
    description: "Multi-dimensional thinking",
    requiredPoints: 500,
    badge: { name: "Architect", icon: "◈", color: "#06B6D4" },
    problemDifficulty: "MEDIUM",
  },
  {
    id: 10,
    name: "Recursion",
    description: "Functions calling themselves",
    requiredPoints: 600,
    badge: { name: "Recursive", icon: "⟳", color: "#0EA5E9" },
    problemDifficulty: "MEDIUM",
  },
  {
    id: 11,
    name: "Sorting Algorithms",
    description: "Organize data efficiently",
    requiredPoints: 700,
    badge: { name: "Organizer", icon: "⇅", color: "#3B82F6" },
    problemDifficulty: "MEDIUM",
  },
  {
    id: 12,
    name: "Searching Techniques",
    description: "Find what you need",
    requiredPoints: 800,
    badge: { name: "Seeker", icon: "⌖", color: "#6366F1" },
    problemDifficulty: "MEDIUM",
  },
  {
    id: 13,
    name: "Data Structures",
    description: "Stacks and queues",
    requiredPoints: 900,
    badge: { name: "Builder", icon: "▣", color: "#8B5CF6" },
    problemDifficulty: "HARD",
  },
  {
    id: 14,
    name: "Graph Basics",
    description: "Connected nodes",
    requiredPoints: 1100,
    badge: { name: "Navigator", icon: "⬣", color: "#A855F7" },
    problemDifficulty: "HARD",
  },
  {
    id: 15,
    name: "Dynamic Programming",
    description: "Optimal substructure",
    requiredPoints: 1300,
    badge: { name: "Optimizer", icon: "◎", color: "#D946EF" },
    problemDifficulty: "HARD",
  },
  {
    id: 16,
    name: "Advanced Algorithms",
    description: "Complex problem solving",
    requiredPoints: 1500,
    badge: { name: "Expert", icon: "★", color: "#EC4899" },
    problemDifficulty: "HARD",
  },
  {
    id: 17,
    name: "Optimization",
    description: "Time and space efficiency",
    requiredPoints: 1700,
    badge: { name: "Efficient", icon: "⚡", color: "#F59E0B" },
    problemDifficulty: "HARD",
  },
  {
    id: 18,
    name: "Mastery",
    description: "Elite problem solver",
    requiredPoints: 1900,
    badge: { name: "Master", icon: "◆", color: "#FFD700" },
    problemDifficulty: "HARD",
  },
];

// Points awarded per difficulty
const POINTS_PER_DIFFICULTY = {
  EASY: 50,
  MEDIUM: 100,
  HARD: 200,
};

// ─── Get Roadmap Data ────────────────────────────────────────────────

router.get(
  "/",
  optionalAuth,
  async (req: Request, res: Response): Promise<void> => {
    // Get all problems grouped by difficulty
    const allProblems = await prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Separate problems by difficulty
    const problemsByDifficulty = {
      EASY: allProblems.filter((p) => p.difficulty === "EASY"),
      MEDIUM: allProblems.filter((p) => p.difficulty === "MEDIUM"),
      HARD: allProblems.filter((p) => p.difficulty === "HARD"),
    };

    // Get user's solved problems if logged in
    let solvedProblemIds: Set<string> = new Set();
    let totalPoints = 0;
    let earnedBadges: string[] = [];

    if (req.user) {
      const solvedSubmissions = await prisma.submission.findMany({
        where: { userId: req.user.userId, verdict: "ACCEPTED" },
        select: { problemId: true, problem: { select: { difficulty: true } } },
        distinct: ["problemId"],
      });

      solvedProblemIds = new Set(solvedSubmissions.map((s) => s.problemId));

      // Calculate total points
      solvedSubmissions.forEach((s) => {
        totalPoints +=
          POINTS_PER_DIFFICULTY[
            s.problem.difficulty as keyof typeof POINTS_PER_DIFFICULTY
          ];
      });

      // Determine earned badges
      ROADMAP_LEVELS.forEach((level) => {
        if (totalPoints >= level.requiredPoints) {
          earnedBadges.push(level.badge.name);
        }
      });
    }

    // Assign ONE problem to each level
    let easyIdx = 0,
      mediumIdx = 0,
      hardIdx = 0;

    const levels = ROADMAP_LEVELS.map((level) => {
      const pool =
        level.problemDifficulty === "EASY"
          ? problemsByDifficulty.EASY
          : level.problemDifficulty === "MEDIUM"
            ? problemsByDifficulty.MEDIUM
            : problemsByDifficulty.HARD;

      const currentIdx =
        level.problemDifficulty === "EASY"
          ? easyIdx
          : level.problemDifficulty === "MEDIUM"
            ? mediumIdx
            : hardIdx;

      // Get ONE problem for this level
      const problem = pool[currentIdx] || null;
      
      // Update index for next level of same difficulty
      if (level.problemDifficulty === "EASY") {
        easyIdx++;
      } else if (level.problemDifficulty === "MEDIUM") {
        mediumIdx++;
      } else {
        hardIdx++;
      }

      const problemData = problem ? {
        ...problem,
        solved: solvedProblemIds.has(problem.id),
        points: POINTS_PER_DIFFICULTY[problem.difficulty as keyof typeof POINTS_PER_DIFFICULTY],
      } : null;

      const isUnlocked = totalPoints >= level.requiredPoints;
      const isCompleted = problemData?.solved || false;

      return {
        ...level,
        problem: problemData,
        isUnlocked,
        isCompleted,
      };
    });

    // Find current level (first unlocked but not completed)
    const currentLevelIndex = levels.findIndex(
      (l) => l.isUnlocked && !l.isCompleted
    );

    res.json({
      levels,
      userProgress: {
        totalPoints,
        earnedBadges,
        currentLevel: currentLevelIndex >= 0 ? currentLevelIndex + 1 : levels.length,
        totalSolved: solvedProblemIds.size,
        nextMilestone:
          levels.find((l) => !l.isUnlocked)?.requiredPoints || null,
      },
    });
  }
);

// ─── Get User Badges ─────────────────────────────────────────────────

router.get(
  "/badges",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    // Get user's total points
    const solvedSubmissions = await prisma.submission.findMany({
      where: { userId: req.user!.userId, verdict: "ACCEPTED" },
      select: { problem: { select: { difficulty: true } } },
      distinct: ["problemId"],
    });

    let totalPoints = 0;
    solvedSubmissions.forEach((s) => {
      totalPoints +=
        POINTS_PER_DIFFICULTY[
          s.problem.difficulty as keyof typeof POINTS_PER_DIFFICULTY
        ];
    });

    const badges = ROADMAP_LEVELS.map((level) => ({
      ...level.badge,
      levelId: level.id,
      levelName: level.name,
      requiredPoints: level.requiredPoints,
      earned: totalPoints >= level.requiredPoints,
    }));

    res.json({
      badges,
      totalPoints,
    });
  }
);

// ─── Get Leaderboard ─────────────────────────────────────────────────

router.get(
  "/leaderboard",
  async (req: Request, res: Response): Promise<void> => {
    // Get all users with their solved problems count and points
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        rating: true,
        submissions: {
          where: { verdict: "ACCEPTED" },
          select: { problemId: true, problem: { select: { difficulty: true } } },
          distinct: ["problemId"],
        },
      },
      take: 100,
    });

    const leaderboard = users
      .map((user) => {
        let points = 0;
        user.submissions.forEach((s) => {
          points +=
            POINTS_PER_DIFFICULTY[
              s.problem.difficulty as keyof typeof POINTS_PER_DIFFICULTY
            ];
        });

        // Find current level
        let currentLevel = 1;
        for (let i = ROADMAP_LEVELS.length - 1; i >= 0; i--) {
          if (points >= ROADMAP_LEVELS[i].requiredPoints) {
            currentLevel = ROADMAP_LEVELS[i].id;
            break;
          }
        }

        const currentLevelData = ROADMAP_LEVELS.find(
          (l) => l.id === currentLevel
        )!;

        return {
          userId: user.id,
          username: user.username,
          rating: user.rating,
          points,
          solvedCount: user.submissions.length,
          currentLevel,
          badge: currentLevelData.badge,
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, 50)
      .map((user, index) => ({ ...user, rank: index + 1 }));

    res.json({ leaderboard });
  }
);

export default router;
