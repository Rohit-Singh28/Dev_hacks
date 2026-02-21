import { prisma } from "../lib/prisma";
import { enqueueSubmission } from "./submissionQueue";
import { updateUserRating } from "./ratingCalculator";
import type { SubmissionJobData } from "./submissionQueue";

const DUEL_TIMER_MAP: Record<string, number> = {
  TEN_MINS: 10 * 60 * 1000,
  THIRTY_MINS: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
};

/**
 * Number of problems required per timer option
 */
const REQUIRED_PROBLEMS: Record<string, number> = {
  TEN_MINS: 1,
  THIRTY_MINS: 2,
  ONE_HOUR: 3,
};

/**
 * Submit code for a specific problem in a duel
 */
export async function submitDuelCode(
  duelId: string,
  userId: string,
  problemId: string,
  language: "CPP" | "PYTHON" | "JAVA",
  sourceCode: string
): Promise<any> {
  // Verify duel exists and user is participant
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: {
      problems: { include: { problem: true } },
      participants: {
        include: { user: { select: { id: true, username: true } } },
      },
    },
  });

  if (!duel) throw new Error("Duel not found");
  if (duel.status !== "IN_PROGRESS") throw new Error("Duel is not active");

  const participant = duel.participants.find((p) => p.userId === userId);
  if (!participant) throw new Error("User is not part of this duel");

  // Verify problem is part of this duel
  const duelProblem = duel.problems.find((dp) => dp.problemId === problemId);
  if (!duelProblem) throw new Error("Problem is not part of this duel");

  // Check if duel time has expired
  if (duel.startedAt) {
    const timerMs = DUEL_TIMER_MAP[duel.timerOption];
    const elapsedTime = Date.now() - duel.startedAt.getTime();
    if (elapsedTime > timerMs) {
      await endDuel(duelId);
      throw new Error("Duel time has expired");
    }
  }

  // Create submission via the normal submission queue
  const submission = await prisma.submission.create({
    data: {
      userId,
      problemId,
      language,
      sourceCode,
      isContest: true,
    },
  });

  // Queue for judging
  await enqueueSubmission({
    submissionId: submission.id,
    userId,
    problemId,
    contestId: null,
    language,
    sourceCode,
    mode: "submit",
  });

  // Upsert the duel participant submission record
  await prisma.duelParticipantSubmission.upsert({
    where: {
      participantId_problemId: {
        participantId: participant.id,
        problemId,
      },
    },
    create: {
      participantId: participant.id,
      problemId,
      submissionId: submission.id,
      solved: false,
    },
    update: {
      submissionId: submission.id,
      solved: false,  // Will be set to true by the judging callback
    },
  });

  return { submissionId: submission.id };
}

/**
 * Check if a user has won the duel (solved all required problems).
 * Called after each submission is judged.
 */
export async function checkDuelWinner(
  duelId: string,
  userId: string
): Promise<boolean> {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: {
      problems: true,
      participants: {
        where: { userId },
        include: {
          submissions: true,
        },
      },
    },
  });

  if (!duel || duel.status !== "IN_PROGRESS") return false;

  const participant = duel.participants[0];
  if (!participant) return false;

  // Check if all problems are solved
  const totalRequired = duel.problems.length;
  const solved = participant.submissions.filter((s) => s.solved).length;

  return solved >= totalRequired;
}

/**
 * Mark a problem as solved for a participant (called after judging)
 */
export async function markProblemSolved(
  participantId: string,
  problemId: string
): Promise<void> {
  await prisma.duelParticipantSubmission.updateMany({
    where: {
      participantId,
      problemId,
    },
    data: { solved: true },
  });
}

/**
 * Check if duel is complete (both users submitted and judged for all problems)
 */
export async function checkDuelCompletion(duelId: string): Promise<boolean> {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: {
      problems: true,
      participants: {
        include: {
          submissions: {
            include: {
              submission: {
                select: { verdict: true },
              },
            },
          },
        },
      },
    },
  });

  if (!duel) return false;

  // Check if any participant solved all problems (instant win)
  for (const p of duel.participants) {
    const solvedCount = p.submissions.filter((s) => s.solved).length;
    if (solvedCount >= duel.problems.length) return true;
  }

  return false;
}

/**
 * Determine winner and end duel
 */
export async function endDuel(duelId: string): Promise<any> {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: {
      problems: true,
      participants: {
        include: {
          user: { select: { id: true, username: true, rating: true } },
          submissions: {
            include: {
              submission: {
                select: {
                  id: true,
                  verdict: true,
                  testsPassed: true,
                  testsTotal: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!duel) throw new Error("Duel not found");
  if (duel.status === "COMPLETED") return duel;

  // Determine winner based on problems solved
  const [p1, p2] = duel.participants;
  const p1Solved = p1.submissions.filter((s) => s.solved).length;
  const p2Solved = p2.submissions.filter((s) => s.solved).length;

  let winner = null;
  let loser = null;

  if (p1Solved > p2Solved) {
    winner = p1;
    loser = p2;
  } else if (p2Solved > p1Solved) {
    winner = p2;
    loser = p1;
  } else if (p1Solved > 0 && p1Solved === p2Solved) {
    // Same number solved — compare last accepted submission time
    const p1LastSolve = p1.submissions
      .filter((s) => s.solved)
      .map((s) => s.submission?.createdAt?.getTime() || Infinity)
      .sort((a, b) => b - a)[0];
    const p2LastSolve = p2.submissions
      .filter((s) => s.solved)
      .map((s) => s.submission?.createdAt?.getTime() || Infinity)
      .sort((a, b) => b - a)[0];

    if (p1LastSolve < p2LastSolve) {
      winner = p1;
      loser = p2;
    } else if (p2LastSolve < p1LastSolve) {
      winner = p2;
      loser = p1;
    }
    // else exact same time — draw
  }

  // Update ratings if there's a winner
  if (winner && loser) {
    const updatedRatings = await updateUserRating(
      winner.user.id,
      loser.user.id,
      true
    );

    await prisma.duelParticipant.update({
      where: { duelId_userId: { duelId, userId: winner.user.id } },
      data: { isWinner: true, ratingAfter: updatedRatings.winnerNewRating },
    });

    await prisma.duelParticipant.update({
      where: { duelId_userId: { duelId, userId: loser.user.id } },
      data: { isWinner: false, ratingAfter: updatedRatings.loserNewRating },
    });
  } else {
    // Tie
    await prisma.duelParticipant.updateMany({
      where: { duelId },
      data: { isWinner: null, ratingAfter: null },
    });
  }

  // Mark duel as complete
  const completedDuel = await prisma.duel.update({
    where: { id: duelId },
    data: { status: "COMPLETED", endedAt: new Date() },
    include: {
      problems: {
        include: { problem: { select: { id: true, title: true, difficulty: true } } },
        orderBy: { orderIdx: "asc" },
      },
      participants: {
        include: {
          user: { select: { id: true, username: true, rating: true } },
          submissions: {
            include: {
              submission: true,
              problem: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });

  return completedDuel;
}

/**
 * Get duel details
 */
export async function getDuel(duelId: string): Promise<any> {
  return prisma.duel.findUnique({
    where: { id: duelId },
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
            select: { id: true, username: true, rating: true },
          },
          submissions: {
            include: {
              submission: {
                select: {
                  id: true,
                  verdict: true,
                  testsPassed: true,
                  testsTotal: true,
                  executionTime: true,
                  memoryUsed: true,
                  createdAt: true,
                },
              },
              problem: {
                select: { id: true, title: true },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Get user's active duel
 */
export async function getUserActiveDuel(
  userId: string
): Promise<any | null> {
  return prisma.duel.findFirst({
    where: {
      status: "IN_PROGRESS",
      participants: {
        some: { userId },
      },
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
        },
      },
    },
  });
}

/**
 * Forfeit a duel — the quitting user loses and the opponent wins automatically.
 */
export async function forfeitDuel(
  duelId: string,
  quittingUserId: string
): Promise<any> {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, username: true, rating: true } },
          submissions: {
            include: { submission: true, problem: { select: { id: true, title: true } } },
          },
        },
      },
    },
  });

  if (!duel) throw new Error("Duel not found");
  if (duel.status === "COMPLETED") throw new Error("Duel is already completed");

  const quitter = duel.participants.find((p) => p.userId === quittingUserId);
  const opponent = duel.participants.find((p) => p.userId !== quittingUserId);

  if (!quitter || !opponent) throw new Error("User is not part of this duel");

  const updatedRatings = await updateUserRating(opponent.user.id, quitter.user.id, true);

  await prisma.duelParticipant.update({
    where: { duelId_userId: { duelId, userId: opponent.user.id } },
    data: { isWinner: true, ratingAfter: updatedRatings.winnerNewRating },
  });

  await prisma.duelParticipant.update({
    where: { duelId_userId: { duelId, userId: quitter.user.id } },
    data: { isWinner: false, ratingAfter: updatedRatings.loserNewRating },
  });

  const completedDuel = await prisma.duel.update({
    where: { id: duelId },
    data: { status: "COMPLETED", endedAt: new Date() },
    include: {
      problems: {
        include: { problem: { select: { id: true, title: true, difficulty: true } } },
        orderBy: { orderIdx: "asc" },
      },
      participants: {
        include: {
          user: { select: { id: true, username: true, rating: true } },
          submissions: {
            include: { submission: true, problem: { select: { id: true, title: true } } },
          },
        },
      },
    },
  });

  return completedDuel;
}
