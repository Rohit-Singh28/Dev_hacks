import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";
import { redis } from "../lib/redis";

// ─── Gemini Client ───────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ─── Redis Chat History ──────────────────────────────────────────────

const CHAT_TTL = 7 * 24 * 60 * 60; // 7 days

function chatKey(userId: string, problemId: string): string {
    return `chat:${userId}:${problemId}`;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

export async function getChatHistory(
    userId: string,
    problemId: string
): Promise<ChatMessage[]> {
    const key = chatKey(userId, problemId);
    const messages = await redis.lrange(key, 0, -1);
    return messages.map((m) => JSON.parse(m));
}

export async function addChatMessage(
    userId: string,
    problemId: string,
    message: ChatMessage
): Promise<void> {
    const key = chatKey(userId, problemId);
    await redis.rpush(key, JSON.stringify(message));
    await redis.expire(key, CHAT_TTL);
}

export async function clearChatHistory(
    userId: string,
    problemId: string
): Promise<void> {
    await redis.del(chatKey(userId, problemId));
}

// ─── Problem Context Builder ─────────────────────────────────────────

interface ProblemContext {
    title: string;
    description: string;
    difficulty: string;
    constraints?: string;
    examples?: { input: string; output: string }[];
}

function buildProblemContext(problem: ProblemContext): string {
    let ctx = `## Problem: ${problem.title}\n`;
    ctx += `**Difficulty:** ${problem.difficulty}\n\n`;
    ctx += `**Description:**\n${problem.description}\n\n`;
    if (problem.constraints) {
        ctx += `**Constraints:**\n${problem.constraints}\n\n`;
    }
    if (problem.examples && problem.examples.length > 0) {
        ctx += `**Examples:**\n`;
        problem.examples.forEach((ex, i) => {
            ctx += `Example ${i + 1}:\n  Input: ${ex.input}\n  Output: ${ex.output}\n`;
        });
    }
    return ctx;
}

// ─── Chatbot ─────────────────────────────────────────────────────────

const CHATBOT_SYSTEM_PROMPT = `You are AlgoNexus AI, a helpful coding assistant embedded in a competitive programming platform.

RULES:
- You are helping a user who is working on a specific coding problem (details provided below).
- Provide hints, approach guidance, and help with edge cases.
- DO NOT give full solutions or complete code unless the user EXPLICITLY asks for the solution.
- When giving hints, be progressive — start with a small nudge, then more specific if they ask again.
- Use clear, concise language. Format with markdown when helpful.
- If the user asks about something unrelated to the problem or coding, politely redirect them.
- Keep responses under 300 words unless a detailed explanation is needed.
`;

export async function chatWithAssistant(
    problem: ProblemContext,
    chatHistory: ChatMessage[],
    userMessage: string
): Promise<string> {
    const problemCtx = buildProblemContext(problem);
    const systemText = CHATBOT_SYSTEM_PROMPT + "\n---\n" + problemCtx;

    // Create a model with system instruction as a Content object
    const chatModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: {
            role: "user",
            parts: [{ text: systemText }],
        },
    });

    const chat = chatModel.startChat({
        history: chatHistory.map((msg) => ({
            role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
            parts: [{ text: msg.content }],
        })),
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
}

// ─── Code Reviewer ───────────────────────────────────────────────────

interface TestResult {
    index: number;
    passed: boolean;
    input?: string;
    expectedOutput?: string;
    actualOutput?: string;
    statusDescription?: string;
}

interface ReviewRequest {
    problem: ProblemContext;
    code: string;
    language: string;
    verdict: string;
    testResults: TestResult[];
    executionTime?: number;
    memoryUsed?: number;
}

function buildReviewPrompt(req: ReviewRequest): string {
    const isCorrect = req.verdict === "ACCEPTED";

    let prompt = `You are AlgoNexus AI, an expert code reviewer on a competitive programming platform.\n\n`;
    prompt += buildProblemContext(req.problem);
    prompt += `\n---\n\n`;
    prompt += `**User's Code (${req.language}):**\n\`\`\`${req.language.toLowerCase()}\n${req.code}\n\`\`\`\n\n`;
    prompt += `**Verdict:** ${req.verdict}\n`;

    if (req.executionTime) prompt += `**Execution Time:** ${req.executionTime}ms\n`;
    if (req.memoryUsed) prompt += `**Memory Used:** ${Math.round(req.memoryUsed / 1024)}MB\n`;

    // Include failed test cases (up to 3)
    const failedTests = req.testResults.filter((t) => !t.passed).slice(0, 3);
    if (failedTests.length > 0) {
        prompt += `\n**Failed Test Cases:**\n`;
        failedTests.forEach((t) => {
            prompt += `- Test ${t.index + 1}: ${t.statusDescription || "Failed"}\n`;
            if (t.input && t.input !== "[hidden]") prompt += `  Input: ${t.input}\n`;
            if (t.expectedOutput && t.expectedOutput !== "[hidden]")
                prompt += `  Expected: ${t.expectedOutput}\n`;
            if (t.actualOutput) prompt += `  Got: ${t.actualOutput}\n`;
        });
    }

    prompt += `\n---\n\n`;

    if (isCorrect) {
        prompt += `The solution is CORRECT. Please:
1. Briefly explain how the solution works (2-3 sentences)
2. State the time and space complexity
3. Suggest any optimizations or better approaches if they exist
4. Mention any edge cases the solution handles well

Keep it concise and encouraging. Use markdown formatting.`;
    } else {
        prompt += `The solution is WRONG (verdict: ${req.verdict}). Please:
1. Identify where the logic likely failed
2. Point out the specific edge case or scenario that may cause the failure
3. Suggest how to fix the issue (without giving the full corrected code)
4. If it's a TLE/MLE, suggest algorithmic improvements

Keep it concise and helpful. Use markdown formatting.`;
    }

    return prompt;
}

export async function reviewCode(req: ReviewRequest): Promise<string> {
    const prompt = buildReviewPrompt(req);
    const result = await model.generateContent(prompt);
    return result.response.text();
}
