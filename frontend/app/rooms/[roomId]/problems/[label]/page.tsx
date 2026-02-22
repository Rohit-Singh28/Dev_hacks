"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { useSubmissionUpdates } from "@/lib/socket";
import { LANGUAGE_DEFAULTS, DIFFICULTY_COLORS } from "@/lib/constants";
import CodeEditor from "@/components/CodeEditor";
import ResultsPanel from "@/components/ResultsPanel";
import WarningDialog from "@/components/WarningDialog";
import CameraFeed from "@/components/CameraFeed";
import ContestEntryGate from "@/components/ContestEntryGate";
import { useContestMonitor } from "@/hooks/useContestMonitor";
import type {
  Language,
  Verdict,
  SubmissionUpdate,
  TestCaseResult,
} from "@/lib/types";

interface RoomProblemData {
  roomProblem: {
    id: string;
    label: string;
    points: number;
    problem: {
      id: string;
      title: string;
      slug: string;
      description: string;
      difficulty: string;
      timeLimit: number;
      memoryLimit: number;
      constraints?: string;
      testCases: {
        id: string;
        input: string;
        output: string;
        orderIndex: number;
      }[];
      hints?: { id: string; content: string; orderIdx: number }[];
    };
  };
  roomId: string;
  roomCode: string;
}

const diffBadge: Record<string, string> = {
  EASY: "bg-emerald-900/50 text-emerald-400 border border-emerald-800/60",
  MEDIUM: "bg-amber-900/50   text-amber-400   border border-amber-800/60",
  HARD: "bg-red-900/50     text-red-400     border border-red-800/60",
};

export default function RoomProblemPage() {
  const { roomId: roomCode, label } = useParams<{
    roomId: string;
    label: string;
  }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<RoomProblemData | null>(null);
  const [loading, setLoading] = useState(true);

  const [language, setLanguage] = useState<Language>("CPP");
  const [code, setCode] = useState(LANGUAGE_DEFAULTS.CPP);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(
    null,
  );
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [compileOutput, setCompileOutput] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [memoryUsed, setMemoryUsed] = useState<number | null>(null);
  const [testsPassed, setTestsPassed] = useState(0);
  const [testsTotal, setTestsTotal] = useState(0);
  const [judging, setJudging] = useState(false);

  const {
    terminated,
    dialogState,
    dismissDialog,
    tabSwitchCount,
    screenViolationCount,
    fullscreenViolationCount,
    screenCaptureViolationCount,
    screenBlackout,
    cameraStream,
    faceDetected,
    cameraError,
  } = useContestMonitor(data?.roomId ?? null);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get(
          `/rooms/${String(roomCode).toUpperCase()}/problems/${label}`,
        );
        setData(res.data);
      } catch {
        router.push(`/rooms/${roomCode}`);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [roomCode, label, router]);

  const handleSubmissionUpdate = useCallback(
    (update: SubmissionUpdate) => {
      if (update.submissionId !== activeSubmissionId) return;
      if (update.verdict === "RUNNING") {
        setJudging(true);
        setVerdict("RUNNING");
        return;
      }
      setJudging(false);
      setRunning(false);
      setSubmitting(false);
      setVerdict(update.verdict);
      setTestResults(update.testResults || []);
      setCompileOutput(update.compileOutput || null);
      setExecutionTime(update.executionTime || null);
      setMemoryUsed(update.memoryUsed || null);
      setTestsPassed(update.testsPassed || 0);
      setTestsTotal(update.testsTotal || 0);
    },
    [activeSubmissionId],
  );
  useSubmissionUpdates(handleSubmissionUpdate);

  const handleRun = async () => {
    if (terminated) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!data) return;
    setRunning(true);
    setJudging(true);
    setVerdict(null);
    setTestResults([]);
    setCompileOutput(null);
    try {
      const { data: res } = await api.post("/submissions/run", {
        problemId: data.roomProblem.problem.id,
        language,
        sourceCode: code,
      });
      setActiveSubmissionId(res.submissionId);
    } catch (err: any) {
      setRunning(false);
      setJudging(false);
      setCompileOutput(err.response?.data?.error || "Failed to run");
    }
  };

  const handleSubmit = async () => {
    if (terminated) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!data) return;
    setSubmitting(true);
    setJudging(true);
    setVerdict(null);
    setTestResults([]);
    setCompileOutput(null);
    try {
      const { data: res } = await api.post(
        `/rooms/${String(roomCode).toUpperCase()}/submit`,
        { problemId: data.roomProblem.problem.id, language, sourceCode: code },
      );
      setActiveSubmissionId(res.submissionId);
    } catch (err: any) {
      setSubmitting(false);
      setJudging(false);
      setCompileOutput(err.response?.data?.error || "Failed to submit");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)] bg-[#0e0e0e]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
          <span className="font-mono text-xs text-zinc-700">
            Loading problem…
          </span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { roomProblem } = data;
  const problem = roomProblem.problem;
  const diff = problem.difficulty.toUpperCase();

  return (
    <ContestEntryGate contestId={data.roomId}>
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      <div className="relative z-10 flex h-[calc(100vh-57px)] bg-[#0e0e0e] text-zinc-100 font-sans antialiased">
        {/* ── Monitoring overlays ── */}
        <WarningDialog
          open={dialogState.open}
          type={dialogState.type}
          title={dialogState.title}
          message={dialogState.message}
          onDismiss={dismissDialog}
        />

        {/* Termination lockout */}
        {terminated && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl border border-red-900/60 bg-zinc-950/90 p-10 text-center max-w-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-900/30 border border-red-800/60">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <p className="text-zinc-100 font-light text-lg mb-1 tracking-tight">
                Contest Terminated
              </p>
              <p className="font-mono text-xs text-zinc-600 mt-2">
                Your session has been locked. Redirecting…
              </p>
            </div>
          </div>
        )}

        {/* Violation badges — top-right cluster */}
        <div className="absolute top-3 right-4 z-30 flex flex-col items-end gap-1.5">
          {!terminated && tabSwitchCount > 0 && (
            <span className="rounded-full bg-amber-900/50 border border-amber-800/60 px-3 py-1 font-mono text-[10px] text-amber-400">
              Tab switches {tabSwitchCount}/3
            </span>
          )}
          {!terminated && fullscreenViolationCount > 0 && (
            <span className="rounded-full bg-violet-900/50 border border-violet-800/60 px-3 py-1 font-mono text-[10px] text-violet-400">
              Fullscreen exits {fullscreenViolationCount}/3
            </span>
          )}
          {!terminated && screenViolationCount > 0 && (
            <span className="rounded-full bg-red-900/50 border border-red-800/60 px-3 py-1 font-mono text-[10px] text-red-400">
              Face-away {screenViolationCount}/3
            </span>
          )}
          {!terminated && screenCaptureViolationCount > 0 && (
            <span className="rounded-full bg-orange-900/50 border border-orange-800/60 px-3 py-1 font-mono text-[10px] text-orange-400">
              Screen capture {screenCaptureViolationCount}/3
            </span>
          )}
        </div>

        {/* Camera feed */}
        {!terminated && (
          <CameraFeed
            stream={cameraStream}
            faceDetected={faceDetected}
            cameraError={cameraError}
          />
        )}

        {/* ── Left panel — Problem description ── */}
        <div className="w-[45%] border-r border-white/[0.06] overflow-y-auto">
          <div className="px-6 py-5">
            {/* Top nav bar */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.06]">
              <Link
                href={`/rooms/${roomCode}`}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Room
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700">
                {data.roomCode}
              </span>
            </div>

            {/* Problem title */}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-px w-5 bg-zinc-700" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  Problem {roomProblem.label}
                </span>
              </div>
              <h1 className="text-2xl font-light tracking-tight text-zinc-100 leading-snug">
                <em
                  className="not-italic text-zinc-400"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {roomProblem.label}.
                </em>{" "}
                {problem.title}
              </h1>
            </div>

            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${diffBadge[diff] ?? "bg-zinc-800/60 text-zinc-400 border border-zinc-700"}`}
              >
                {problem.difficulty}
              </span>
              <span className="rounded-md px-2.5 py-1 text-[10px] font-medium bg-sky-900/50 text-sky-400 border border-sky-800/60">
                {roomProblem.points} pts
              </span>
              <span className="font-mono text-[10px] text-zinc-600">
                Time {problem.timeLimit}ms
              </span>
              <span className="font-mono text-[10px] text-zinc-600">
                Memory {problem.memoryLimit}MB
              </span>
            </div>

            {/* Description */}
            <pre className="whitespace-pre-wrap text-sm text-zinc-400 font-sans leading-relaxed mb-6">
              {problem.description}
            </pre>

            {/* Constraints */}
            {problem.constraints && (
              <div className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-px w-5 bg-zinc-700" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Constraints
                  </span>
                </div>
                <pre className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500 font-mono whitespace-pre-wrap">
                  {problem.constraints}
                </pre>
              </div>
            )}

            {/* Test cases */}
            {problem.testCases.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-px w-5 bg-zinc-700" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Examples
                  </span>
                </div>
                <div className="space-y-3">
                  {problem.testCases.map((tc, i) => (
                    <div
                      key={tc.id}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden"
                    >
                      <div className="px-4 py-2 border-b border-white/[0.05] bg-white/[0.02]">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                          Example {i + 1}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
                        <div className="p-4">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-700 mb-2">
                            Input
                          </p>
                          <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
                            {tc.input}
                          </pre>
                        </div>
                        <div className="p-4">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-700 mb-2">
                            Output
                          </p>
                          <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
                            {tc.output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hints */}
            {problem.hints && problem.hints.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-px w-5 bg-zinc-700" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Hints
                  </span>
                </div>
                <div className="space-y-2">
                  {problem.hints.map((h) => (
                    <details
                      key={h.id}
                      className="group rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden"
                    >
                      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors list-none">
                        <span className="font-mono text-[10px] uppercase tracking-widest">
                          Hint {h.orderIdx + 1}
                        </span>
                        <svg
                          className="h-3 w-3 transition-transform group-open:rotate-180"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </summary>
                      <div className="border-t border-white/[0.05] px-4 py-3">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {h.content}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel — Editor + Results ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <CodeEditor
              language={language}
              onLanguageChange={setLanguage}
              code={code}
              onCodeChange={setCode}
              onRun={handleRun}
              onSubmit={handleSubmit}
              running={running}
              submitting={submitting}
              disabled={terminated}
            />
          </div>
          <div className="h-[35%] overflow-y-auto border-t border-white/[0.06]">
            <ResultsPanel
              verdict={verdict}
              testResults={testResults}
              compileOutput={compileOutput}
              executionTime={executionTime}
              memoryUsed={memoryUsed}
              testsPassed={testsPassed}
              testsTotal={testsTotal}
              loading={judging}
            />
          </div>
        </div>
      </div>
    </ContestEntryGate>
  );
}
