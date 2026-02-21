"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { useSubmissionUpdates, useContestRoom } from "@/lib/socket";
import { LANGUAGE_DEFAULTS, DIFFICULTY_COLORS } from "@/lib/constants";
import CodeEditor from "@/components/CodeEditor";
import ResultsPanel from "@/components/ResultsPanel";
import ContestTimer from "@/components/ContestTimer";
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

interface ContestProblemData {
  contestProblem: {
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
    };
  };
  contestId: string;
}

/* ─────────────────────────────────────────────
   Difficulty badge
───────────────────────────────────────────── */
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, string> = {
    EASY: "bg-emerald-900/50 text-emerald-400 border border-emerald-800/60",
    MEDIUM: "bg-amber-900/50   text-amber-400   border border-amber-800/60",
    HARD: "bg-red-900/50     text-red-400     border border-red-800/60",
  };
  const label: Record<string, string> = {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${map[difficulty] ?? map.HARD}`}
    >
      {label[difficulty] ?? difficulty}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Violation pill
───────────────────────────────────────────── */
function ViolationPill({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: "amber" | "red" | "purple" | "orange";
}) {
  const map = {
    amber: "bg-amber-900/50  border-amber-800/50  text-amber-300",
    red: "bg-red-900/50    border-red-800/50    text-red-300",
    purple: "bg-violet-900/50 border-violet-800/50 text-violet-300",
    orange: "bg-orange-900/50 border-orange-800/50 text-orange-300",
  };
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] ${map[color]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          color === "amber"
            ? "bg-amber-400"
            : color === "red"
              ? "bg-red-400"
              : color === "purple"
                ? "bg-violet-400"
                : "bg-orange-400"
        }`}
      />
      {label}: {count}/3
    </div>
  );
}

export default function ContestProblemPage() {
  const { slug, label } = useParams<{ slug: string; label: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [data, setData] = useState<ContestProblemData | null>(null);
  const [contest, setContest] = useState<any>(null);
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

  useContestRoom(data?.contestId ?? null);

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
  } = useContestMonitor(data?.contestId ?? null);

  useEffect(() => {
    async function fetch() {
      try {
        const [problemRes, contestRes] = await Promise.all([
          api.get(`/contests/${slug}/problems/${label}`),
          api.get(`/contests/${slug}`),
        ]);
        setData(problemRes.data);
        setContest(contestRes.data.contest);
      } catch {
        router.push(`/contests/${slug}`);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [slug, label, router]);

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
        problemId: data.contestProblem.problem.id,
        language,
        sourceCode: code,
        contestId: data.contestId,
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
      const { data: res } = await api.post("/submissions/submit", {
        problemId: data.contestProblem.problem.id,
        language,
        sourceCode: code,
        contestId: data.contestId,
      });
      setActiveSubmissionId(res.submissionId);
    } catch (err: any) {
      setSubmitting(false);
      setJudging(false);
      setCompileOutput(err.response?.data?.error || "Failed to submit");
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center bg-[#0e0e0e]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  if (!data || !contest) return null;

  const { contestProblem } = data;
  const problem = contestProblem.problem;

  return (
    <ContestEntryGate contestId={data.contestId}>
      <div className="relative flex h-[calc(100vh-57px)] bg-[#0e0e0e]">
        {/* ── Warning / termination dialog ── */}
        <WarningDialog
          open={dialogState.open}
          type={dialogState.type}
          title={dialogState.title}
          message={dialogState.message}
          onDismiss={dismissDialog}
        />

        {/* ── Termination overlay ── */}
        {terminated && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl border border-red-900/60 bg-zinc-950/90 px-10 py-8 text-center shadow-2xl">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-900/40 border border-red-800/50">
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
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <p className="text-base font-semibold text-red-400 mb-1">
                Contest Terminated
              </p>
              <p className="font-mono text-xs text-zinc-600">
                Your session has been locked. Redirecting…
              </p>
            </div>
          </div>
        )}

        {/* ── Violation pills (top-right cluster) ── */}
        {!terminated && (
          <div className="absolute top-3 right-4 z-30 flex flex-col items-end gap-1.5">
            {tabSwitchCount > 0 && (
              <ViolationPill
                count={tabSwitchCount}
                label="Tab switches"
                color="amber"
              />
            )}
            {screenViolationCount > 0 && (
              <ViolationPill
                count={screenViolationCount}
                label="Face-away"
                color="red"
              />
            )}
            {fullscreenViolationCount > 0 && (
              <ViolationPill
                count={fullscreenViolationCount}
                label="Fullscreen exits"
                color="purple"
              />
            )}
            {screenCaptureViolationCount > 0 && (
              <ViolationPill
                count={screenCaptureViolationCount}
                label="Screen capture"
                color="orange"
              />
            )}
          </div>
        )}

        {/* ── Camera feed ── */}
        {!terminated && (
          <CameraFeed
            stream={cameraStream}
            faceDetected={faceDetected}
            cameraError={cameraError}
          />
        )}

        {/* ════════════════════════════════════════
            LEFT PANEL — Problem description
        ════════════════════════════════════════ */}
        <div className="w-[45%] overflow-y-auto border-r border-white/[0.06]">
          <div className="px-7 py-5">
            {/* Contest nav + timer */}
            <div className="mb-5 flex items-center justify-between border-b border-white/[0.05] pb-4">
              <Link
                href={`/contests/${slug}`}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-600 transition-colors hover:text-zinc-300"
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
                {contest.title}
              </Link>
              <ContestTimer
                startTime={contest.startTime}
                endTime={contest.endTime}
                status={contest.status}
              />
            </div>

            {/* Problem title */}
            <h1 className="mb-3 text-xl font-light tracking-tight text-zinc-100">
              <span className="font-mono text-zinc-600">
                {contestProblem.label}.&nbsp;
              </span>
              {problem.title}
            </h1>

            {/* Meta pills */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={problem.difficulty} />
              <span className="inline-flex items-center rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-zinc-500">
                {contestProblem.points} pts
              </span>
              <span className="inline-flex items-center rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-zinc-500">
                {problem.timeLimit} ms
              </span>
              <span className="inline-flex items-center rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-zinc-500">
                {problem.memoryLimit} MB
              </span>
            </div>

            {/* Description */}
            <pre className="mb-7 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-400">
              {problem.description}
            </pre>

            {/* Constraints */}
            {problem.constraints && (
              <div className="mb-7">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-px w-4 bg-zinc-800" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    Constraints
                  </span>
                </div>
                <pre className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 font-mono text-xs text-zinc-400 whitespace-pre-wrap">
                  {problem.constraints}
                </pre>
              </div>
            )}

            {/* Examples */}
            {problem.testCases.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-px w-4 bg-zinc-800" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    Examples
                  </span>
                </div>
                <div className="space-y-3">
                  {problem.testCases.map((tc, i) => (
                    <div
                      key={tc.id}
                      className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]"
                    >
                      <div className="border-b border-white/[0.05] px-4 py-2">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                          Example {i + 1}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
                        <div className="px-4 py-3">
                          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-700">
                            Input
                          </p>
                          <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap">
                            {tc.input}
                          </pre>
                        </div>
                        <div className="px-4 py-3">
                          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-700">
                            Output
                          </p>
                          <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap">
                            {tc.output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT PANEL — Editor + Results
        ════════════════════════════════════════ */}
        <div className="flex flex-1 flex-col">
          <div className="min-h-0 flex-1">
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
