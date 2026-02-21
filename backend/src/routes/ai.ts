import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { prisma } from "../lib/prisma";
import {
    chatWithAssistant,
    reviewCode,
    getChatHistory,
    addChatMessage,
    clearChatHistory,
} from "../services/aiService";

const router = Router();

router.use(authMiddleware);

// ─── Schemas ─────────────────────────────────────────────────────────

const chatSchema = z.object({
    problemId: z.string().uuid(),
    message: z.string().min(1).max(2000),
});

const reviewSchema = z.object({
    problemId: z.string().uuid(),
    code: z.string().min(1).max(100_000),
    language: z.string(),
    verdict: z.string(),
    testResults: z.array(z.any()),
    executionTime: z.any().optional(),
    memoryUsed: z.any().optional(),
});

// ─── Helper ──────────────────────────────────────────────────────────

async function getProblemContext(problemId: string) {
    const problem = await prisma.problem.findUnique({
        where: { id: problemId },
        select: {
            title: true,
            description: true,
            difficulty: true,
            constraints: true,
            testCases: {
                where: { isHidden: false },
                select: { input: true, output: true },
                take: 3,
            },
        },
    });

    if (!problem) return null;

    return {
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        constraints: problem.constraints || undefined,
        examples: problem.testCases.map((tc) => ({
            input: tc.input,
            output: tc.output,
        })),
    };
}

// ─── Chat Routes ─────────────────────────────────────────────────────

/**
 * POST /api/ai/chat
 * Send a message to the AI chatbot
 */
router.post(
    "/chat",
    validate(chatSchema),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { problemId, message } = req.body;
            const userId = req.user!.userId;

            const problem = await getProblemContext(problemId);
            if (!problem) {
                res.status(404).json({ error: "Problem not found" });
                return;
            }

            // Get existing chat history
            const history = await getChatHistory(userId, problemId);

            // Save user message
            await addChatMessage(userId, problemId, {
                role: "user",
                content: message,
                timestamp: Date.now(),
            });

            // Get AI response
            const aiResponse = await chatWithAssistant(problem, history, message);

            // Save AI response
            await addChatMessage(userId, problemId, {
                role: "assistant",
                content: aiResponse,
                timestamp: Date.now(),
            });

            res.json({ response: aiResponse });
        } catch (error: any) {
            console.error("AI chat error:", error);
            res.status(500).json({
                error: "AI service temporarily unavailable",
                details: error.message,
            });
        }
    }
);

/**
 * GET /api/ai/chat/:problemId
 * Get chat history for a problem
 */
router.get(
    "/chat/:problemId",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const problemId = req.params.problemId;
            const userId = req.user!.userId;
            const history = await getChatHistory(userId, problemId);
            res.json({ messages: history });
        } catch (error) {
            console.error("Error getting chat history:", error);
            res.status(500).json({ error: "Failed to get chat history" });
        }
    }
);

/**
 * DELETE /api/ai/chat/:problemId
 * Clear chat history for a problem
 */
router.delete(
    "/chat/:problemId",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const problemId = req.params.problemId;
            const userId = req.user!.userId;
            await clearChatHistory(userId, problemId);
            res.json({ success: true });
        } catch (error) {
            console.error("Error clearing chat history:", error);
            res.status(500).json({ error: "Failed to clear chat history" });
        }
    }
);

// ─── Code Review Route ───────────────────────────────────────────────

/**
 * POST /api/ai/review
 * Get AI code review for a submission
 */
router.post(
    "/review",
    validate(reviewSchema),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { problemId, code, language, verdict, testResults, executionTime, memoryUsed } =
                req.body;

            const problem = await getProblemContext(problemId);
            if (!problem) {
                res.status(404).json({ error: "Problem not found" });
                return;
            }

            const review = await reviewCode({
                problem,
                code,
                language,
                verdict,
                testResults,
                executionTime: executionTime || undefined,
                memoryUsed: memoryUsed || undefined,
            });

            res.json({ review });
        } catch (error: any) {
            console.error("AI review error:", error);
            res.status(500).json({
                error: "AI service temporarily unavailable",
                details: error.message,
            });
        }
    }
);

export default router;
