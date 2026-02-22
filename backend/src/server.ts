import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { initWebSocket } from "./websocket";
import { startSubmissionWorker } from "./services/submissionQueue";
import { startContestStatusWorker } from "./services/contestWorker";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/auth";
import problemRoutes from "./routes/problems";
import submissionRoutes from "./routes/submissions";
import contestRoutes from "./routes/contests";
import duelRoutes from "./routes/duels";
import bookmarkRoutes from "./routes/bookmarks";
import userRoutes from "./routes/users";
import roomRoutes from "./routes/rooms";
import aiRoutes from "./routes/ai";
import roadmapRoutes from "./routes/roadmap";
import adminRoutes from "./routes/admin";

const app = express();
const server = http.createServer(app);

// ─── Security ────────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

// Global rate limiter: 100 requests per minute per IP
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  }),
);

// Stricter rate limit for submission endpoints
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 submissions per minute
  message: { error: "Submission rate limit exceeded" },
});

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Server time endpoint for client clock sync
app.get("/api/time", (_req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionLimiter, submissionRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/duels", duelRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/admin", adminRoutes);

// ─── Error Handler ───────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────

initWebSocket(server);
startSubmissionWorker();
startContestStatusWorker();

server.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  🚀 CodeArena Backend                    ║
║  Port: ${config.port}                            ║
║  Env:  ${config.env}                    ║
╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down...");
  server.close(() => process.exit(0));
});
