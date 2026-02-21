import { Queue, Worker, Job } from "bullmq";
import { redis } from "../lib/redis";
import type { ConnectionOptions } from "bullmq";
import { prisma } from "../lib/prisma";
import {
  judge0Service,
  Judge0Submission,
  JUDGE0_STATUS,
  isRuntimeError,
} from "./judge0";
import { config } from "../config";
import { Verdict, Language } from "@prisma/client";
import { emitSubmissionUpdate } from "../websocket";

// ─── Queue Setup ─────────────────────────────────────────────────────

const QUEUE_NAME = "submissions";

export const submissionQueue = new Queue(QUEUE_NAME, {
  connection: redis as unknown as ConnectionOptions,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
  },
});

// ─── Types ───────────────────────────────────────────────────────────

export interface SubmissionJobData {
  submissionId: string;
  userId: string;
  problemId: string;
  contestId: string | null;
  language: Language;
  sourceCode: string;
  mode: "run" | "submit"; // run = visible only, submit = all
}

export interface RunResult {
  submissionId: string;
  verdict: Verdict;
  testResults: TestCaseResult[];
  executionTime: number | null;
  memoryUsed: number | null;
  compileOutput: string | null;
}

interface TestCaseResult {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  passed: boolean;
  statusDescription: string;
  time: string | null;
  memory: number | null;
  isHidden: boolean;
}

// ─── Enqueue ─────────────────────────────────────────────────────────

export async function enqueueSubmission(
  data: SubmissionJobData,
): Promise<string> {
  const job = await submissionQueue.add("judge", data, {
    // Priority: contest submissions get higher priority
    priority: data.contestId ? 1 : 5,
  });
  return job.id!;
}

// ─── Worker ──────────────────────────────────────────────────────────

function mapVerdict(statusId: number): Verdict {
  if (statusId === JUDGE0_STATUS.ACCEPTED) return "ACCEPTED";
  if (statusId === JUDGE0_STATUS.WRONG_ANSWER) return "WRONG_ANSWER";
  if (statusId === JUDGE0_STATUS.TIME_LIMIT_EXCEEDED)
    return "TIME_LIMIT_EXCEEDED";
  if (statusId === JUDGE0_STATUS.COMPILATION_ERROR) return "COMPILATION_ERROR";
  if (isRuntimeError(statusId)) return "RUNTIME_ERROR";
  // Treat memory-related errors
  if (statusId === JUDGE0_STATUS.RUNTIME_ERROR_SIGXFSZ)
    return "MEMORY_LIMIT_EXCEEDED";
  return "RUNTIME_ERROR";
}

async function processSubmission(job: Job<SubmissionJobData>): Promise<void> {
  const {
    submissionId,
    userId,
    problemId,
    contestId,
    language,
    sourceCode,
    mode,
  } = job.data;

  // Mark as RUNNING
  await prisma.submission.update({
    where: { id: submissionId },
    data: { verdict: "RUNNING" },
  });
  emitSubmissionUpdate(userId, { submissionId, verdict: "RUNNING" });

  // Fetch test cases — avoid N+1 by fetching all at once
  const testCases = await prisma.testCase.findMany({
    where: {
      problemId,
      ...(mode === "run" ? { isHidden: false } : {}),
    },
    orderBy: { orderIndex: "asc" },
  });

  // Fetch problem limits
  const problem = await prisma.problem.findUniqueOrThrow({
    where: { id: problemId },
    select: { timeLimit: true, memoryLimit: true },
  });

  if (testCases.length === 0) {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { verdict: "ACCEPTED", testsPassed: 0, testsTotal: 0 },
    });
    emitSubmissionUpdate(userId, {
      submissionId,
      verdict: "ACCEPTED",
      testResults: [],
    });
    return;
  }

  const languageId = config.languageMap[language];

  // Build Judge0 submissions — one per test case (plain text, not base64)
  const judge0Submissions: Judge0Submission[] = testCases.map((tc) => ({
    source_code: sourceCode,
    language_id: languageId,
    stdin: tc.input,
    expected_output: tc.output,
    cpu_time_limit: problem.timeLimit / 1000, // ms → seconds
    memory_limit: problem.memoryLimit,
  }));

  // Submit batch to Judge0
  const tokens = await judge0Service.submitBatch(judge0Submissions);
  const tokenStrings = tokens.map((t) => t.token);

  // Poll for results
  const results = await judge0Service.pollBatchResults(tokenStrings);

  // Build test case results
  let overallVerdict: Verdict = "ACCEPTED";
  let maxTime = 0;
  let maxMemory = 0;
  let testsPassed = 0;
  let compileOutput: string | null = null;
  const testResults: TestCaseResult[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const tc = testCases[i];
    const passed = r.status.id === JUDGE0_STATUS.ACCEPTED;

    if (passed) testsPassed++;

    const actualOutput = r.stdout?.trim() ?? null;
    const time = r.time ? parseFloat(r.time) * 1000 : null; // to ms
    const memory = r.memory ?? null;

    if (time && time > maxTime) maxTime = time;
    if (memory && memory > maxMemory) maxMemory = memory;

    // Check for memory limit
    let verdictForCase = mapVerdict(r.status.id);
    if (memory && memory > problem.memoryLimit) {
      verdictForCase = "MEMORY_LIMIT_EXCEEDED";
    }

    if (!passed && overallVerdict === "ACCEPTED") {
      overallVerdict = verdictForCase;
    }

    if (r.compile_output && !compileOutput) {
      compileOutput = r.compile_output;
    }

    testResults.push({
      index: i,
      input: tc.input,
      expectedOutput: tc.output,
      actualOutput,
      passed,
      statusDescription: r.status.description,
      time: r.time,
      memory,
      isHidden: tc.isHidden,
    });
  }

  // Persist final verdict
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      verdict: overallVerdict,
      executionTime: Math.round(maxTime),
      memoryUsed: Math.round(maxMemory),
      testsPassed,
      testsTotal: testCases.length,
      compileOutput,
      stderr: results.find((r) => r.stderr)?.stderr ?? null,
    },
  });

  // If contest submission & accepted → update participant score
  if (contestId && mode === "submit" && overallVerdict === "ACCEPTED") {
    await updateContestScore(contestId, userId, problemId);
  }

  // Emit real-time result
  emitSubmissionUpdate(userId, {
    submissionId,
    verdict: overallVerdict,
    testsPassed,
    testsTotal: testCases.length,
    executionTime: Math.round(maxTime),
    memoryUsed: Math.round(maxMemory),
    compileOutput,
    testResults: testResults.map((tr) => ({
      ...tr,
      // Never expose hidden test case inputs/expected outputs to the client
      input: tr.isHidden ? "[hidden]" : tr.input,
      expectedOutput: tr.isHidden ? "[hidden]" : tr.expectedOutput,
    })),
  });
}

// ─── Contest Score Update ─────────────────────────────────────────────

async function updateContestScore(
  contestId: string,
  userId: string,
  problemId: string,
): Promise<void> {
  // Check if user already solved this problem in this contest
  const existingAC = await prisma.submission.findFirst({
    where: {
      contestId,
      userId,
      problemId,
      verdict: "ACCEPTED",
      id: { not: undefined }, // just to be explicit
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
  });

  if (!existingAC) return; // shouldn't happen but safety check

  // Get contest problem points
  const contestProblem = await prisma.contestProblem.findUnique({
    where: { contestId_problemId: { contestId, problemId } },
    select: { points: true },
  });
  if (!contestProblem) return;

  // Get contest start time for penalty calculation
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { startTime: true },
  });
  if (!contest) return;

  // Count wrong submissions before first AC for penalty
  const wrongSubmissions = await prisma.submission.count({
    where: {
      contestId,
      userId,
      problemId,
      verdict: { not: "ACCEPTED" },
      createdAt: { lt: existingAC.createdAt },
    },
  });

  const solveTimeSeconds = Math.floor(
    (existingAC.createdAt.getTime() - contest.startTime.getTime()) / 1000,
  );
  const penalty = solveTimeSeconds + wrongSubmissions * 20 * 60; // 20 min per wrong attempt

  // Recalculate total score for this user in this contest
  // Get all unique problems solved by this user
  const solvedProblems = await prisma.submission.findMany({
    where: {
      contestId,
      userId,
      verdict: "ACCEPTED",
    },
    distinct: ["problemId"],
    select: { problemId: true },
  });

  const solvedProblemIds = solvedProblems.map((s) => s.problemId);

  // Get total points
  const contestProblems = await prisma.contestProblem.findMany({
    where: {
      contestId,
      problemId: { in: solvedProblemIds },
    },
    select: { points: true },
  });

  const totalScore = contestProblems.reduce((sum, cp) => sum + cp.points, 0);

  // Upsert participant score
  await prisma.contestParticipant.upsert({
    where: { contestId_userId: { contestId, userId } },
    update: {
      score: totalScore,
      penalty: penalty, // This is simplified — full penalty = sum of all problems
    },
    create: {
      contestId,
      userId,
      score: totalScore,
      penalty,
    },
  });
}

// ─── Start Worker ────────────────────────────────────────────────────

export function startSubmissionWorker(): void {
  const worker = new Worker<SubmissionJobData>(
    QUEUE_NAME,
    async (job) => {
      await processSubmission(job);
    },
    {
      connection: redis as unknown as ConnectionOptions,
      concurrency: 5, // Process up to 5 submissions concurrently
      limiter: {
        max: 10,
        duration: 1000, // Max 10 jobs per second to not overwhelm Judge0
      },
    },
  );

  worker.on("completed", (job) => {
    console.log(`✅ Submission ${job.data.submissionId} judged`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Submission ${job?.data.submissionId} failed:`, err);
    // Update submission to show error
    if (job) {
      prisma.submission
        .update({
          where: { id: job.data.submissionId },
          data: { verdict: "RUNTIME_ERROR", stderr: err.message },
        })
        .catch(console.error);
    }
  });

  console.log("🔧 Submission worker started (concurrency: 5)");
}
