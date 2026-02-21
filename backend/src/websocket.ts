import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { AuthPayload } from "./middleware/auth";
import { getUserActiveDuel } from "./services/duelJudge";

let io: SocketIOServer;

/**
 * Initialize Socket.IO server with JWT auth.
 *
 * Rooms:
 *   user:<userId>       — private room for submission updates
 *   contest:<contestId> — contest room for scoreboard + timer broadcasts
 *   duel:<duelId>       — duel room for both participants
 */
export function initWebSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    transports: ["websocket", "polling"],
  });

  // Auth middleware — verify JWT on connect
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;
      (socket as any).userId = payload.userId;
      (socket as any).username = payload.username;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const username = (socket as any).username as string;
    console.log(`🔌 User connected: ${username} (${userId})`);

    // Auto-join personal room
    socket.join(`user:${userId}`);

    // Join contest room
    socket.on("join-contest", (contestId: string) => {
      socket.join(`contest:${contestId}`);
      console.log(`👤 ${username} joined contest:${contestId}`);
    });

    socket.on("leave-contest", (contestId: string) => {
      socket.leave(`contest:${contestId}`);
    });

    // ─── Duel Events ─────────────────────────────────────────────────

    /**
     * Join duel room
     */
    socket.on("duel:join", async (duelId: string) => {
      socket.join(`duel:${duelId}`);
      console.log(`⚔️  ${username} joined duel:${duelId}`);

      // Notify other participant
      socket.to(`duel:${duelId}`).emit("duel:opponent-connected", {
        username,
        userId,
      });
    });

    /**
     * Leave duel room
     */
    socket.on("duel:leave", (duelId: string) => {
      socket.leave(`duel:${duelId}`);
      console.log(`⚔️  ${username} left duel:${duelId}`);

      socket.to(`duel:${duelId}`).emit("duel:opponent-disconnected", {
        username,
        userId,
      });
    });

    /**
     * Code update (live coding visualization)
     */
    socket.on("duel:code-update", (data: { duelId: string; code: string }) => {
      // Send code update to opponent only (not back to sender)
      socket.to(`duel:${data.duelId}`).emit("duel:opponent-code-update", {
        userId,
        username,
        code: data.code,
      });
    });

    /**
     * Submission acknowledged
     */
    socket.on("duel:submission-received", (data: { duelId: string; submissionId: string }) => {
      socket.to(`duel:${data.duelId}`).emit("duel:opponent-submitted", {
        userId,
        username,
        submissionId: data.submissionId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${username}`);
    });
  });

  return io;
}

/**
 * Emit submission status update to a specific user.
 */
export function emitSubmissionUpdate(userId: string, data: any): void {
  if (io) {
    io.to(`user:${userId}`).emit("submission-update", data);
  }
}

/**
 * Emit scoreboard update to all users in a contest room.
 */
export function emitScoreboardUpdate(contestId: string, data: any): void {
  if (io) {
    io.to(`contest:${contestId}`).emit("scoreboard-update", data);
  }
}

/**
 * Emit contest timer/status events.
 */
export function emitContestEvent(
  contestId: string,
  event: string,
  data: any
): void {
  if (io) {
    io.to(`contest:${contestId}`).emit(event, data);
  }
}

// ─── Duel Events ──────────────────────────────────────────────────────

/**
 * Notify both participants that a duel has started
 */
export function emitDuelStart(duelId: string, duelData: any): void {
  if (io) {
    io.to(`duel:${duelId}`).emit("duel:started", duelData);
  }
}

/**
 * Notify both participants that a duel has ended
 */
export function emitDuelEnd(duelId: string, result: any): void {
  if (io) {
    io.to(`duel:${duelId}`).emit("duel:ended", result);
  }
}

/**
 * Notify a specific duel participant about submission verdict
 */
export function emitDuelSubmissionUpdate(userId: string, duelId: string, data: any): void {
  if (io) {
    io.to(`user:${userId}`).emit("duel:submission-update", {
      duelId,
      ...data,
    });
  }
}

/**
 * Notify both participants of timer tick
 */
export function emitDuelTimer(duelId: string, data: any): void {
  if (io) {
    io.to(`duel:${duelId}`).emit("duel:timer-update", data);
  }
}

export function getIO(): SocketIOServer {
  return io;
}
