import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { AuthPayload } from "./middleware/auth";

let io: SocketIOServer;

/**
 * Initialize Socket.IO server with JWT auth.
 *
 * Rooms:
 *   user:<userId>       — private room for submission updates
 *   contest:<contestId> — contest room for scoreboard + timer broadcasts
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

export function getIO(): SocketIOServer {
  return io;
}
