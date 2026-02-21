import { prisma } from "../lib/prisma";
import { emitContestEvent } from "../websocket";

/**
 * Periodically updates contest statuses (UPCOMING → ACTIVE → ENDED).
 *
 * Runs every 5 seconds. In production, use a proper cron/scheduler
 * or database triggers. This is simple and correct for moderate scale.
 */
export function startContestStatusWorker(): void {
  const INTERVAL_MS = 5000;

  async function tick() {
    const now = new Date();

    // UPCOMING → ACTIVE
    const activated = await prisma.contest.updateMany({
      where: {
        status: "UPCOMING",
        startTime: { lte: now },
      },
      data: { status: "ACTIVE" },
    });

    if (activated.count > 0) {
      console.log(`🏁 ${activated.count} contest(s) now ACTIVE`);
      // Fetch and emit for each
      const activeContests = await prisma.contest.findMany({
        where: { status: "ACTIVE", startTime: { lte: now }, endTime: { gt: now } },
        select: { id: true },
      });
      for (const c of activeContests) {
        emitContestEvent(c.id, "contest-started", { contestId: c.id });
      }
    }

    // ACTIVE → ENDED
    const ended = await prisma.contest.updateMany({
      where: {
        status: "ACTIVE",
        endTime: { lte: now },
      },
      data: { status: "ENDED" },
    });

    if (ended.count > 0) {
      console.log(`🏁 ${ended.count} contest(s) ENDED`);
      const endedContests = await prisma.contest.findMany({
        where: { status: "ENDED", endTime: { lte: now } },
        select: { id: true },
      });
      for (const c of endedContests) {
        emitContestEvent(c.id, "contest-ended", { contestId: c.id });
        // Compute final rankings
        await computeFinalRankings(c.id);
      }
    }
  }

  setInterval(tick, INTERVAL_MS);
  console.log("⏱️  Contest status worker started (5s interval)");
}

/**
 * Compute final rankings for a contest and update participant records.
 */
async function computeFinalRankings(contestId: string): Promise<void> {
  const participants = await prisma.contestParticipant.findMany({
    where: { contestId },
    orderBy: [{ score: "desc" }, { penalty: "asc" }],
  });

  // Update ranks
  for (let i = 0; i < participants.length; i++) {
    await prisma.contestParticipant.update({
      where: { id: participants[i].id },
      data: { rank: i + 1 },
    });
  }

  console.log(
    `🏆 Final rankings computed for contest ${contestId}: ${participants.length} participants`
  );
}
