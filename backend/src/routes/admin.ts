import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { validate } from "../middleware/validate";

const router = Router();

// ─── Hardcoded Admin Credentials ─────────────────────────────────────
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin123";

// ─── Admin Auth Middleware ───────────────────────────────────────────

function adminAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing authorization header" });
        return;
    }

    try {
        const payload = jwt.verify(header.slice(7), config.jwt.secret) as any;
        if (!payload.isAdmin) {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired admin token" });
    }
}

// ─── Schemas ─────────────────────────────────────────────────────────

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const weeklyContestSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    startDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
    endDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    prizes: z.string().optional(),
    isActive: z.boolean().default(true),
});

// ─── Helper: slug from title ─────────────────────────────────────────

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// ─── Admin Login ─────────────────────────────────────────────────────

router.post(
    "/login",
    validate(loginSchema),
    async (req: Request, res: Response): Promise<void> => {
        const { email, password } = req.body;

        if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
            res.status(401).json({ error: "Invalid admin credentials" });
            return;
        }

        const token = jwt.sign({ isAdmin: true }, config.jwt.secret, {
            expiresIn: "24h",
        });

        res.json({ token, message: "Admin login successful" });
    }
);

// ─── List Weekly Contests (admin) ────────────────────────────────────

router.get(
    "/weekly-contests",
    adminAuth,
    async (_req: Request, res: Response): Promise<void> => {
        const contests = await prisma.weeklyContest.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.json({ contests });
    }
);

// ─── Create Weekly Contest ───────────────────────────────────────────

router.post(
    "/weekly-contests",
    adminAuth,
    validate(weeklyContestSchema),
    async (req: Request, res: Response): Promise<void> => {
        const { title, description, startDate, endDate, difficulty, prizes, isActive } =
            req.body;

        const slug = slugify(title) + "-" + Date.now().toString(36);

        const contest = await prisma.weeklyContest.create({
            data: {
                title,
                slug,
                description: description || null,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                difficulty,
                prizes: prizes || null,
                isActive,
            },
        });

        res.status(201).json({ contest });
    }
);

// ─── Update Weekly Contest ───────────────────────────────────────────

router.put(
    "/weekly-contests/:id",
    adminAuth,
    async (req: Request, res: Response): Promise<void> => {
        const { id } = req.params;

        const existing = await prisma.weeklyContest.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Weekly contest not found" });
            return;
        }

        const data: any = {};
        if (req.body.title !== undefined) {
            data.title = req.body.title;
            data.slug = slugify(req.body.title) + "-" + Date.now().toString(36);
        }
        if (req.body.description !== undefined) data.description = req.body.description;
        if (req.body.startDate !== undefined) data.startDate = new Date(req.body.startDate);
        if (req.body.endDate !== undefined) data.endDate = new Date(req.body.endDate);
        if (req.body.difficulty !== undefined) data.difficulty = req.body.difficulty;
        if (req.body.prizes !== undefined) data.prizes = req.body.prizes;
        if (req.body.isActive !== undefined) data.isActive = req.body.isActive;

        const contest = await prisma.weeklyContest.update({
            where: { id },
            data,
        });

        res.json({ contest });
    }
);

// ─── Delete Weekly Contest ───────────────────────────────────────────

router.delete(
    "/weekly-contests/:id",
    adminAuth,
    async (req: Request, res: Response): Promise<void> => {
        const { id } = req.params;

        const existing = await prisma.weeklyContest.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Weekly contest not found" });
            return;
        }

        await prisma.weeklyContest.delete({ where: { id } });
        res.json({ message: "Weekly contest deleted" });
    }
);

export default router;
