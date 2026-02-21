import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// ─── Get Active Weekly Contests (public) ─────────────────────────────

router.get("/", async (_req: Request, res: Response): Promise<void> => {
    const contests = await prisma.weeklyContest.findMany({
        where: {
            isActive: true,
        },
        orderBy: { startDate: "desc" },
    });

    res.json({ contests });
});

export default router;
