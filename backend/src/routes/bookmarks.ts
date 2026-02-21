import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// All bookmark routes require auth
router.use(authMiddleware);

// ─── Schemas ─────────────────────────────────────────────────────────

const toggleBookmarkSchema = z.object({
  problemId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

const updateBookmarkSchema = z.object({
  note: z.string().max(500).optional(),
});

// ─── Toggle Bookmark (add/remove) ────────────────────────────────────

router.post(
  "/toggle",
  validate(toggleBookmarkSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { problemId, note } = req.body;

    // Check if problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });
    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    // Check if already bookmarked
    const existing = await prisma.bookmark.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });

    if (existing) {
      // Remove bookmark
      await prisma.bookmark.delete({ where: { id: existing.id } });
      res.json({ bookmarked: false, message: "Bookmark removed" });
    } else {
      // Add bookmark
      const bookmark = await prisma.bookmark.create({
        data: { userId, problemId, note },
      });
      res
        .status(201)
        .json({ bookmarked: true, bookmark, message: "Problem bookmarked" });
    }
  },
);

// ─── Update Bookmark Note ────────────────────────────────────────────

router.patch(
  "/:problemId",
  validate(updateBookmarkSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const problemId = String(req.params.problemId);
    const { note } = req.body;

    const bookmark = await prisma.bookmark.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });

    if (!bookmark) {
      res.status(404).json({ error: "Bookmark not found" });
      return;
    }

    const updated = await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: { note },
    });

    res.json({ bookmark: updated });
  },
);

// ─── List User's Bookmarks ──────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(String(req.query.limit ?? "20"))),
  );

  const [bookmarks, total] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
            timeLimit: true,
            memoryLimit: true,
            _count: { select: { submissions: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bookmark.count({ where: { userId } }),
  ]);

  res.json({
    bookmarks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─── Check if a Problem is Bookmarked ────────────────────────────────

router.get(
  "/check/:problemId",
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const problemId = String(req.params.problemId);

    const bookmark = await prisma.bookmark.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });

    res.json({ bookmarked: !!bookmark, note: bookmark?.note || null });
  },
);

export default router;
