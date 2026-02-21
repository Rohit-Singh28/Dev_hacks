import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { DuelTimerOption } from "@prisma/client";

const RATING_RANGE = 100; // ±100 rating points for matching
const MATCH_TIMEOUT = 30000; // 30 seconds

/**
 * Problem requirements per timer option
 */
const PROBLEM_REQUIREMENTS: Record<string, { difficulty: "EASY" | "MEDIUM" | "HARD"; label: string }[]> = {
  TEN_MINS: [
    { difficulty: "EASY", label: "A" },
  ],
  THIRTY_MINS: [
    { difficulty: "EASY", label: "A" },
    { difficulty: "MEDIUM", label: "B" },
  ],
  ONE_HOUR: [
    { difficulty: "EASY", label: "A" },
    { difficulty: "MEDIUM", label: "B" },
    { difficulty: "HARD", label: "C" },
  ],
};

/**
 * Join a user to the duel queue.
 * Automatically attempts to match with an opponent.
 */
export async function joinDuelQueue(
  userId: string,
  timerOption: DuelTimerOption
): Promise<{ matched: boolean; duelId?: string; opponent?: any; problems?: any[] }> {
  // Get user's current rating
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, rating: true },
  });

  if (!user) throw new Error("User not found");

  // Define rating range for matching
  const minRating = Math.max(800, user.rating - RATING_RANGE);
  const maxRating = user.rating + RATING_RANGE;

  // Add user to duel queue
  await prisma.duelQueue.create({
    data: {
      userId: user.id,
      timerOption,
      minRating,
      maxRating,
    },
  });

  // Store in Redis for quick access (auto-expire after timeout)
  const queueKey = `duel-queue:${timerOption}`;
  await redis.zadd(
    queueKey,
    Date.now(),
    JSON.stringify({ userId: user.id, rating: user.rating })
  );
  await redis.expire(queueKey, Math.floor(MATCH_TIMEOUT / 1000));

  // Try to find a matching opponent
  const opponent = await findMatchingOpponent(user, timerOption, minRating, maxRating);

  if (opponent) {
    // Create duel with multiple problems
    const duel = await createDuel(user.id, opponent.userId, timerOption);
    return {
      matched: true,
      duelId: duel.id,
      opponent: { id: opponent.userId, username: opponent.username },
      problems: duel.problems.map((dp: any) => ({
        id: dp.problem.id,
        title: dp.problem.title,
        difficulty: dp.problem.difficulty,
        label: dp.label,
      })),
    };
  }

  return { matched: false };
}

/**
 * Find a matching opponent from the queue
 */
async function findMatchingOpponent(
  user: any,
  timerOption: DuelTimerOption,
  minRating: number,
  maxRating: number
) {
  // Find another user in queue with same timer preference and rating range
  const queuedUser = await prisma.duelQueue.findFirst({
    where: {
      timerOption,
      userId: { not: user.id },
      minRating: { lte: user.rating },
      maxRating: { gte: user.rating },
    },
    orderBy: { queuedAt: "asc" },
  });

  if (!queuedUser) return null;

  // Get the user details
  const opponentUser = await prisma.user.findUnique({
    where: { id: queuedUser.userId },
    select: { id: true, username: true, rating: true },
  });

  if (!opponentUser) return null;

  return {
    userId: opponentUser.id,
    username: opponentUser.username,
    rating: opponentUser.rating,
  };
}

/**
 * Select a random problem of a given difficulty, excluding certain IDs.
 */
async function selectProblem(difficulty: "EASY" | "MEDIUM" | "HARD", excludeIds: string[]) {
  const count = await prisma.problem.count({
    where: {
      difficulty,
      id: { notIn: excludeIds },
    },
  });

  if (count === 0) {
    // Fallback: try without exclusion
    const fallbackCount = await prisma.problem.count({ where: { difficulty } });
    if (fallbackCount === 0) throw new Error(`No problems found with difficulty ${difficulty}`);
    const idx = Math.floor(Math.random() * fallbackCount);
    return prisma.problem.findFirst({
      where: { difficulty },
      skip: idx,
      include: {
        testCases: {
          where: { isHidden: false },
          select: { id: true, input: true, output: true },
        },
      },
    });
  }

  const idx = Math.floor(Math.random() * count);
  return prisma.problem.findFirst({
    where: {
      difficulty,
      id: { notIn: excludeIds },
    },
    skip: idx,
    include: {
      testCases: {
        where: { isHidden: false },
        select: { id: true, input: true, output: true },
      },
    },
  });
}

/**
 * Create a duel between two users with multiple problems
 */
async function createDuel(
  userId1: string,
  userId2: string,
  timerOption: DuelTimerOption
) {
  // Get user ratings
  const users = await prisma.user.findMany({
    where: { id: { in: [userId1, userId2] } },
    select: { id: true, rating: true },
  });

  // Select problems based on timer option
  const requirements = PROBLEM_REQUIREMENTS[timerOption];
  const selectedProblemIds: string[] = [];
  const problemsData: { problemId: string; label: string; orderIdx: number }[] = [];

  for (let i = 0; i < requirements.length; i++) {
    const req = requirements[i];
    const problem = await selectProblem(req.difficulty, selectedProblemIds);
    if (!problem) throw new Error(`No ${req.difficulty} problem found`);
    selectedProblemIds.push(problem.id);
    problemsData.push({ problemId: problem.id, label: req.label, orderIdx: i });
  }

  // Create duel with problems and participants
  const duel = await prisma.duel.create({
    data: {
      timerOption,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      problems: {
        create: problemsData,
      },
      participants: {
        create: [
          {
            userId: userId1,
            ratingBefore: users.find((u) => u.id === userId1)!.rating,
          },
          {
            userId: userId2,
            ratingBefore: users.find((u) => u.id === userId2)!.rating,
          },
        ],
      },
    },
    include: {
      problems: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              description: true,
              difficulty: true,
              timeLimit: true,
              memoryLimit: true,
              constraints: true,
              testCases: {
                where: { isHidden: false },
              },
            },
          },
        },
        orderBy: { orderIdx: "asc" },
      },
      participants: {
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
      },
    },
  });

  // Remove both users from queue
  await prisma.duelQueue.deleteMany({
    where: { userId: { in: [userId1, userId2] } },
  });

  return duel;
}

/**
 * Leave the duel queue
 */
export async function leaveDuelQueue(userId: string): Promise<void> {
  await prisma.duelQueue.deleteMany({
    where: { userId },
  });
}

/**
 * Get queue status for a timer option
 */
export async function getQueueStatus(timerOption: DuelTimerOption): Promise<number> {
  const count = await prisma.duelQueue.count({
    where: { timerOption },
  });
  return count;
}

/**
 * Get user's queue status
 */
export async function getUserQueueStatus(userId: string): Promise<any> {
  const queueEntry = await prisma.duelQueue.findFirst({
    where: { userId },
  });
  return queueEntry;
}
