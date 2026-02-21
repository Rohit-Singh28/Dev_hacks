import { prisma } from "../lib/prisma";

const K_FACTOR = 32; // Controls rating volatility (standard chess: 32 for rated players)
const BASE_RATING = 1200;

/**
 * Elo rating calculation for 1v1 matches
 * Formula: newRating = currentRating + K * (result - expectedScore)
 * where expectedScore = 1 / (1 + 10^((opponentRating - currentRating) / 400))
 */
function calculateEloChange(
  playerRating: number,
  opponentRating: number,
  playerWon: boolean
): number {
  const ratingDiff = opponentRating - playerRating;
  const expectedScore = 1 / (1 + Math.pow(10, ratingDiff / 400));
  const result = playerWon ? 1 : 0;
  const ratingChange = Math.round(K_FACTOR * (result - expectedScore));

  return ratingChange;
}

/**
 * Update ratings for both players after a duel
 */
export async function updateUserRating(
  winnerId: string,
  loserId: string,
  winnerIsFirstUser: boolean
): Promise<{ winnerNewRating: number; loserNewRating: number }> {
  // Get current ratings
  const [winner, loser] = await Promise.all([
    prisma.user.findUnique({ where: { id: winnerId }, select: { rating: true } }),
    prisma.user.findUnique({ where: { id: loserId }, select: { rating: true } }),
  ]);

  if (!winner || !loser) {
    throw new Error("User not found");
  }

  // Calculate rating changes
  const winnerChange = calculateEloChange(winner.rating, loser.rating, true);
  const loserChange = calculateEloChange(loser.rating, winner.rating, false);

  const winnerNewRating = Math.max(800, winner.rating + winnerChange); // Floor at 800
  const loserNewRating = Math.max(800, loser.rating + loserChange); // Floor at 800

  // Update both users
  await Promise.all([
    prisma.user.update({
      where: { id: winnerId },
      data: { rating: winnerNewRating },
    }),
    prisma.user.update({
      where: { id: loserId },
      data: { rating: loserNewRating },
    }),
  ]);

  return { winnerNewRating, loserNewRating };
}

/**
 * Calculate expected rating change without applying it
 */
export function getExpectedRatingChange(
  playerRating: number,
  opponentRating: number,
  playerWins: boolean
): number {
  return calculateEloChange(playerRating, opponentRating, playerWins);
}

/**
 * Get user's rating statistics
 */
export async function getUserRatingStats(userId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      rating: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get duel stats
  const duels = await prisma.duelParticipant.findMany({
    where: { userId },
    include: {
      duel: true,
    },
  });

  const completedDuels = duels.filter((d) => d.duel.status === "COMPLETED");
  const wins = completedDuels.filter((d) => d.isWinner === true).length;
  const losses = completedDuels.filter((d) => d.isWinner === false).length;
  const draws = completedDuels.filter((d) => d.isWinner === null).length;

  return {
    ...user,
    totalDuels: completedDuels.length,
    wins,
    losses,
    draws,
    winRate: completedDuels.length > 0 ? (wins / completedDuels.length * 100).toFixed(1) : 0,
  };
}
