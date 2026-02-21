import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware, optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import crypto from "crypto";

const router = Router();

// ─── Helper: Generate a 6-char alphanumeric room code ────────────────

function generateRoomCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. "A3F1B2"
}

// ─── Create Room (Host a Contest) ────────────────────────────────────

const createRoomSchema = z.object({
  title: z.string().min(3).max(100),
  problemIds: z
    .array(z.string().uuid())
    .min(1, "Select at least 1 problem")
    .max(4, "Maximum 4 problems allowed"),
  duration: z.number().int().min(10).max(300).default(60), // 10min – 5hrs
});

router.post(
  "/",
  authMiddleware,
  validate(createRoomSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { title, problemIds, duration } = req.body;

    // Verify all problems exist
    const problems = await prisma.problem.findMany({
      where: { id: { in: problemIds } },
      select: { id: true, title: true },
    });

    if (problems.length !== problemIds.length) {
      res.status(400).json({ error: "One or more problems not found" });
      return;
    }

    // Generate unique room code
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.room.findUnique({ where: { roomCode } });
      if (!existing) break;
      roomCode = generateRoomCode();
      attempts++;
    }

    const labels = ["A", "B", "C", "D"];

    const room = await prisma.room.create({
      data: {
        roomCode,
        title,
        hostId: req.user!.userId,
        duration,
        roomProblems: {
          create: problemIds.map((pid: string, idx: number) => ({
            problemId: pid,
            label: labels[idx],
            points: 100,
            orderIdx: idx,
          })),
        },
        // Auto-add host as participant
        roomParticipants: {
          create: {
            userId: req.user!.userId,
          },
        },
      },
      include: {
        roomProblems: {
          orderBy: { orderIdx: "asc" },
          include: {
            problem: {
              select: { id: true, title: true, slug: true, difficulty: true },
            },
          },
        },
        _count: { select: { roomParticipants: true } },
      },
    });

    res.status(201).json({ room });
  },
);

// ─── Join Room ───────────────────────────────────────────────────────

router.post(
  "/join",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { roomCode } = req.body;

    if (!roomCode || typeof roomCode !== "string") {
      res.status(400).json({ error: "Room code is required" });
      return;
    }

    const room = await prisma.room.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: { _count: { select: { roomParticipants: true } } },
    });

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    if (room.status === "ENDED") {
      res.status(400).json({ error: "This room contest has already ended" });
      return;
    }

    // Upsert — idempotent join
    await prisma.roomParticipant.upsert({
      where: {
        roomId_userId: { roomId: room.id, userId: req.user!.userId },
      },
      update: {},
      create: { roomId: room.id, userId: req.user!.userId },
    });

    res.json({ message: "Joined room successfully", roomCode: room.roomCode });
  },
);

// ─── Get Room Details ────────────────────────────────────────────────

router.get(
  "/:roomCode",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const room = await prisma.room.findUnique({
      where: { roomCode: String(req.params.roomCode).toUpperCase() },
      include: {
        host: { select: { id: true, username: true } },
        roomProblems: {
          orderBy: { orderIdx: "asc" },
          include: {
            problem: {
              select: { id: true, title: true, slug: true, difficulty: true },
            },
          },
        },
        roomParticipants: {
          include: {
            user: { select: { id: true, username: true, rating: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { roomParticipants: true } },
      },
    });

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    // Check if current user is a participant
    const isParticipant = room.roomParticipants.some(
      (p) => p.userId === req.user!.userId,
    );
    const isHost = room.hostId === req.user!.userId;

    // Hide problems if room hasn't started yet (unless user is host)
    let problems = room.roomProblems;
    if (room.status === "WAITING" && !isHost) {
      problems = [];
    }

    res.json({
      room: { ...room, roomProblems: problems },
      isHost,
      isParticipant,
      serverTime: new Date().toISOString(),
    });
  },
);

// ─── Start Room Contest (Host Only) ──────────────────────────────────

router.post(
  "/:roomCode/start",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const room = await prisma.room.findUnique({
      where: { roomCode: String(req.params.roomCode).toUpperCase() },
    });

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    if (room.hostId !== req.user!.userId) {
      res.status(403).json({ error: "Only the host can start the contest" });
      return;
    }

    if (room.status !== "WAITING") {
      res.status(400).json({ error: "Room has already started or ended" });
      return;
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + room.duration * 60 * 1000);

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: { status: "ACTIVE", startTime: now, endTime },
    });

    res.json({
      message: "Contest started!",
      startTime: updated.startTime,
      endTime: updated.endTime,
    });
  },
);

// ─── End Room Contest (Host Only) ────────────────────────────────────

router.post(
  "/:roomCode/end",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const room = await prisma.room.findUnique({
      where: { roomCode: String(req.params.roomCode).toUpperCase() },
    });

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    if (room.hostId !== req.user!.userId) {
      res.status(403).json({ error: "Only the host can end the contest" });
      return;
    }

    if (room.status === "ENDED") {
      res.status(400).json({ error: "Room has already ended" });
      return;
    }

    await prisma.room.update({
      where: { id: room.id },
      data: { status: "ENDED", endTime: new Date() },
    });

    res.json({ message: "Contest ended" });
  },
);

// ─── Get Room Problem ────────────────────────────────────────────────

router.get(
  "/:roomCode/problems/:label",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const room = await prisma.room.findUnique({
      where: { roomCode: String(req.params.roomCode).toUpperCase() },
    });

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    if (room.status === "WAITING") {
      res.status(400).json({ error: "Contest has not started yet" });
      return;
    }

    // Verify user is a participant
    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: { roomId: room.id, userId: req.user!.userId },
      },
    });

    if (!participant) {
      res.status(403).json({ error: "You must join this room first" });
      return;
    }

    const roomProblem = await prisma.roomProblem.findUnique({
      where: {
        roomId_label: {
          roomId: room.id,
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
            hints: {
              orderBy: { orderIdx: "asc" },
              select: { id: true, content: true, orderIdx: true },
            },
          },
        },
      },
    });

    if (!roomProblem) {
      res.status(404).json({ error: "Problem not found in this room" });
      return;
    }

    res.json({
      roomProblem,
      roomId: room.id,
      roomCode: room.roomCode,
      serverTime: new Date().toISOString(),
    });
  },
);

// ─── Room Scoreboard ─────────────────────────────────────────────────

router.get(
  "/:roomCode/scoreboard",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const room = await prisma.room.findUnique({
      where: { roomCode: String(req.params.roomCode).toUpperCase() },
      select: { id: true, status: true, startTime: true, endTime: true },
    });

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id },
      orderBy: [{ score: "desc" }, { penalty: "asc" }],
      include: {
        user: { select: { id: true, username: true, rating: true } },
      },
    });

    const roomProblems = await prisma.roomProblem.findMany({
      where: { roomId: room.id },
      orderBy: { orderIdx: "asc" },
      select: { id: true, label: true, problemId: true, points: true },
    });

    // Get accepted submissions for this room
    const acceptedSubmissions = await prisma.submission.findMany({
      where: { roomId: room.id, verdict: "ACCEPTED" },
      distinct: ["userId", "problemId"],
      select: { userId: true, problemId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const solvedMap = new Map<string, Set<string>>();
    for (const sub of acceptedSubmissions) {
      if (!solvedMap.has(sub.userId)) solvedMap.set(sub.userId, new Set());
      solvedMap.get(sub.userId)!.add(sub.problemId);
    }

    const scoreboard = participants.map((p, idx) => ({
      rank: idx + 1,
      user: p.user,
      score: p.score,
      penalty: p.penalty,
      solvedProblems: roomProblems.map((rp) => ({
        label: rp.label,
        problemId: rp.problemId,
        solved: solvedMap.get(p.userId)?.has(rp.problemId) ?? false,
      })),
    }));

    res.json({
      roomId: room.id,
      problems: roomProblems,
      scoreboard,
      serverTime: new Date().toISOString(),
    });
  },
);

// ─── Submit Code for Room Contest ────────────────────────────────────

router.post(
  "/:roomCode/submit",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { problemId, language, sourceCode } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomCode: String(req.params.roomCode).toUpperCase() },
    });

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    if (room.status !== "ACTIVE") {
      res.status(400).json({ error: "Contest is not active" });
      return;
    }

    // Check if room time has expired
    if (room.endTime && new Date() > room.endTime) {
      await prisma.room.update({
        where: { id: room.id },
        data: { status: "ENDED" },
      });
      res.status(400).json({ error: "Contest has ended" });
      return;
    }

    // Verify participant
    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: { roomId: room.id, userId: req.user!.userId },
      },
    });

    if (!participant) {
      res.status(403).json({ error: "You must join this room first" });
      return;
    }

    // Verify problem belongs to room
    const roomProblem = await prisma.roomProblem.findUnique({
      where: { roomId_problemId: { roomId: room.id, problemId } },
    });

    if (!roomProblem) {
      res.status(400).json({ error: "Problem not in this room" });
      return;
    }

    // Get test case count
    const testsTotal = await prisma.testCase.count({
      where: { problemId },
    });

    // Create the submission
    const submission = await prisma.submission.create({
      data: {
        userId: req.user!.userId,
        problemId,
        roomId: room.id,
        language,
        sourceCode,
        isContest: true,
        testsTotal,
      },
    });

    // Enqueue for judging (reuse existing submission queue)
    const { enqueueSubmission } = await import("../services/submissionQueue");
    await enqueueSubmission(submission.id);

    res.status(201).json({ submissionId: submission.id });
  },
);

// ─── List User's Rooms ──────────────────────────────────────────────

router.get(
  "/my/hosted",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const rooms = await prisma.room.findMany({
      where: { hostId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { roomParticipants: true, roomProblems: true } },
      },
    });

    res.json({ rooms });
  },
);

export default router;
