import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validate } from "../middleware/validate";
import { authMiddleware, optionalAuth } from "../middleware/auth";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────

const createPostSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(50000),
  tags: z.string().optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
});

const createEditorialSchema = z.object({
  problemId: z.string().uuid(),
  title: z.string().min(3).max(200),
  content: z.string().min(50).max(100000),
  language: z.string().optional(),
});

// ─── Posts ───────────────────────────────────────────────────────────

// Get all posts (paginated)
router.get("/posts", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true, rating: true } },
        _count: { select: { comments: true, likes: true } },
        likes: req.user
          ? { where: { userId: req.user.userId }, select: { id: true } }
          : false,
      },
    }),
    prisma.post.count(),
  ]);

  res.json({
    posts: posts.map((p) => ({
      ...p,
      liked: req.user ? p.likes && (p.likes as any[]).length > 0 : false,
      likes: undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Get single post
router.get("/posts/:id", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id as string },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true, rating: true } },
      _count: { select: { comments: true, likes: true } },
      likes: req.user
        ? { where: { userId: req.user.userId }, select: { id: true } }
        : false,
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, username: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json({
    ...post,
    liked: req.user ? post.likes && (post.likes as any[]).length > 0 : false,
    likes: undefined,
  });
});

// Create post
router.post(
  "/posts",
  authMiddleware,
  validate(createPostSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { title, content, tags } = req.body;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        tags,
        authorId: req.user!.userId,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true, rating: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });

    res.status(201).json(post);
  }
);

// Delete post (author only)
router.delete("/posts/:id", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id as string } });

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (post.authorId !== req.user!.userId) {
    res.status(403).json({ error: "Not authorized to delete this post" });
    return;
  }

  await prisma.post.delete({ where: { id: req.params.id as string } });
  res.json({ success: true });
});

// Like/unlike a post
router.post("/posts/:id/like", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const postId = req.params.id as string;
  const userId = req.user!.userId;

  const existingLike = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existingLike) {
    // Unlike
    await prisma.postLike.delete({ where: { id: existingLike.id } });
    res.json({ liked: false });
  } else {
    // Like
    await prisma.postLike.create({ data: { postId, userId } });
    res.json({ liked: true });
  }
});

// ─── Comments ────────────────────────────────────────────────────────

// Add comment to post
router.post(
  "/posts/:id/comments",
  authMiddleware,
  validate(createCommentSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { content, parentId } = req.body;

    const post = await prisma.post.findUnique({ where: { id: req.params.id as string } });
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    // If parentId is provided, verify the parent comment exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parentComment || parentComment.postId !== (req.params.id as string)) {
        res.status(400).json({ error: "Invalid parent comment" });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId: req.params.id as string,
        authorId: req.user!.userId,
        parentId,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.status(201).json(comment);
  }
);

// Delete comment (author only)
router.delete("/comments/:id", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id as string } });

  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (comment.authorId !== req.user!.userId) {
    res.status(403).json({ error: "Not authorized to delete this comment" });
    return;
  }

  await prisma.comment.delete({ where: { id: req.params.id as string } });
  res.json({ success: true });
});

// ─── Editorials ──────────────────────────────────────────────────────

// Get editorials for a problem
router.get("/editorials/problem/:problemId", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const editorials = await prisma.editorial.findMany({
    where: { problemId: req.params.problemId as string },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true, rating: true } },
      votes: true,
    },
  });

  const result = editorials.map((e) => {
    const upvotes = e.votes.filter((v) => v.value === 1).length;
    const downvotes = e.votes.filter((v) => v.value === -1).length;
    const userVote = req.user
      ? e.votes.find((v) => v.userId === req.user!.userId)?.value || 0
      : 0;

    return {
      ...e,
      votes: undefined,
      score: upvotes - downvotes,
      upvotes,
      downvotes,
      userVote,
    };
  });

  // Sort by score descending
  result.sort((a, b) => b.score - a.score);

  res.json(result);
});

// Get all editorials (latest, paginated)
router.get("/editorials", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const [editorials, total] = await Promise.all([
    prisma.editorial.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true, rating: true } },
        problem: { select: { id: true, title: true, slug: true, difficulty: true } },
        votes: true,
      },
    }),
    prisma.editorial.count(),
  ]);

  const result = editorials.map((e) => {
    const upvotes = e.votes.filter((v) => v.value === 1).length;
    const downvotes = e.votes.filter((v) => v.value === -1).length;
    const userVote = req.user
      ? e.votes.find((v) => v.userId === req.user!.userId)?.value || 0
      : 0;

    return {
      ...e,
      votes: undefined,
      score: upvotes - downvotes,
      upvotes,
      downvotes,
      userVote,
    };
  });

  res.json({
    editorials: result,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Get single editorial
router.get("/editorials/:id", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const editorial = await prisma.editorial.findUnique({
    where: { id: req.params.id as string },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true, rating: true } },
      problem: { select: { id: true, title: true, slug: true, difficulty: true } },
      votes: true,
    },
  });

  if (!editorial) {
    res.status(404).json({ error: "Editorial not found" });
    return;
  }

  const upvotes = (editorial as any).votes.filter((v: any) => v.value === 1).length;
  const downvotes = (editorial as any).votes.filter((v: any) => v.value === -1).length;
  const userVote = req.user
    ? (editorial as any).votes.find((v: any) => v.userId === req.user!.userId)?.value || 0
    : 0;

  res.json({
    ...editorial,
    votes: undefined,
    score: upvotes - downvotes,
    upvotes,
    downvotes,
    userVote,
  });
});

// Create editorial
router.post(
  "/editorials",
  authMiddleware,
  validate(createEditorialSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { problemId, title, content, language } = req.body;

    // Verify problem exists
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    const editorial = await prisma.editorial.create({
      data: {
        problemId,
        title,
        content,
        language,
        authorId: req.user!.userId,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true, rating: true } },
        problem: { select: { id: true, title: true, slug: true, difficulty: true } },
      },
    });

    res.status(201).json({ ...editorial, score: 0, upvotes: 0, downvotes: 0, userVote: 0 });
  }
);

// Delete editorial (author only)
router.delete("/editorials/:id", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const editorial = await prisma.editorial.findUnique({ where: { id: req.params.id as string } });

  if (!editorial) {
    res.status(404).json({ error: "Editorial not found" });
    return;
  }

  if (editorial.authorId !== req.user!.userId) {
    res.status(403).json({ error: "Not authorized to delete this editorial" });
    return;
  }

  await prisma.editorial.delete({ where: { id: req.params.id as string } });
  res.json({ success: true });
});

// Vote on editorial
router.post("/editorials/:id/vote", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const editorialId = req.params.id as string;
  const userId = req.user!.userId;
  const value = parseInt(req.body.value);

  if (value !== 1 && value !== -1 && value !== 0) {
    res.status(400).json({ error: "Invalid vote value. Must be 1, -1, or 0" });
    return;
  }

  const editorial = await prisma.editorial.findUnique({ where: { id: editorialId as string } });
  if (!editorial) {
    res.status(404).json({ error: "Editorial not found" });
    return;
  }

  const existingVote = await prisma.editorialVote.findUnique({
    where: { editorialId_userId: { editorialId: editorialId as string, userId } },
  });

  if (value === 0) {
    // Remove vote
    if (existingVote) {
      await prisma.editorialVote.delete({ where: { id: existingVote.id } });
    }
  } else if (existingVote) {
    // Update vote
    await prisma.editorialVote.update({
      where: { id: existingVote.id },
      data: { value },
    });
  } else {
    // Create vote
    await prisma.editorialVote.create({
      data: { editorialId: editorialId as string, userId, value },
    });
  }

  // Get updated counts
  const votes = await prisma.editorialVote.findMany({ where: { editorialId: editorialId as string } });
  const upvotes = votes.filter((v) => v.value === 1).length;
  const downvotes = votes.filter((v) => v.value === -1).length;

  res.json({
    score: upvotes - downvotes,
    upvotes,
    downvotes,
    userVote: value,
  });
});

export default router;
