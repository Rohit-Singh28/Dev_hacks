"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { useSubmissionUpdates } from "@/lib/socket";
import {
  LANGUAGE_DEFAULTS,
  DIFFICULTY_COLORS,
  VERDICT_COLORS,
  VERDICT_LABELS,
} from "@/lib/constants";
import CodeEditor from "@/components/CodeEditor";
import ResultsPanel from "@/components/ResultsPanel";
import AIChatPanel from "@/components/AIChatPanel";
import type {
  Problem,
  Language,
  Verdict,
  SubmissionUpdate,
  TestCaseResult,
  Submission,
} from "@/lib/types";

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

export default function ProblemDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());

  const [language, setLanguage] = useState<Language>("CPP");
  const [code, setCode] = useState(LANGUAGE_DEFAULTS.CPP);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isSubmitRef = useRef(false);

  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(
    null,
  );
  const activeSubIdRef = useRef<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [compileOutput, setCompileOutput] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [memoryUsed, setMemoryUsed] = useState<number | null>(null);
  const [testsPassed, setTestsPassed] = useState(0);
  const [testsTotal, setTestsTotal] = useState(0);
  const [judging, setJudging] = useState(false);

  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "description" | "submissions" | "review"
  >("description");

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get(`/problems/${slug}`);
        setProblem(data.problem);
        setUserSubmissions(data.userSubmissions || []);
        if (user) {
          try {
            const bookmarkRes = await api.get(
              `/bookmarks/check/${data.problem.id}`,
            );
            setBookmarked(bookmarkRes.data.bookmarked);
          } catch {
            /* ignore */
          }
        }
      } catch {
        router.push("/problems");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [slug, router, user]);

  const triggerAiReview = useCallback(
    async (verdictVal: string, results: TestCaseResult[]) => {
      if (!problem) return;
      setAiReviewLoading(true);
      setAiReview(null);
      setActiveTab("review");
      try {
        const { data } = await api.post("/ai/review", {
          problemId: problem.id,
          code,
          language,
          verdict: verdictVal,
          testResults: results.map((r, i) => ({
            index: i,
            passed: r.passed,
            input: r.input,
            expectedOutput: r.expectedOutput,
            actualOutput: r.actualOutput || null,
            statusDescription: r.statusDescription,
          })),
          executionTime: null,
          memoryUsed: null,
        });
        setAiReview(data.review);
        setActiveTab("review");
      } catch (err: any) {
        console.error("AI review error:", err.response?.data || err.message);
        setAiReview("AI review is temporarily unavailable.");
        setActiveTab("review");
      } finally {
        setAiReviewLoading(false);
      }
    },
    [problem, code, language],
  );

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triggerAiReviewRef = useRef(triggerAiReview);
  triggerAiReviewRef.current = triggerAiReview;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const applyResults = useCallback(
    (
      v: Verdict,
      extra: {
        testResults?: TestCaseResult[];
        compileOutput?: string | null;
        executionTime?: number | null;
        memoryUsed?: number | null;
        testsPassed?: number;
        testsTotal?: number;
      },
    ) => {
      stopPolling();
      setVerdict(v);
      setTestResults(extra.testResults || []);
      setCompileOutput(extra.compileOutput || null);
      setExecutionTime(extra.executionTime || null);
      setMemoryUsed(extra.memoryUsed || null);
      setTestsPassed(extra.testsPassed || 0);
      setTestsTotal(extra.testsTotal || 0);
      setJudging(false);
      setRunning(false);
      setSubmitting(false);
    },
    [stopPolling],
  );

  const startPolling = useCallback(
    (subId: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const { data } = await api.get(`/submissions/${subId}`);
          const s = data.submission;
          if (s.verdict && s.verdict !== "PENDING" && s.verdict !== "RUNNING") {
            applyResults(s.verdict, {
              testResults: s.testResults || [],
              compileOutput: s.compileOutput,
              executionTime: s.executionTime,
              memoryUsed: s.memoryUsed,
              testsPassed: s.testsPassed,
              testsTotal: s.testsTotal,
            });
            if (isSubmitRef.current) triggerAiReviewRef.current(s.verdict, []);
          }
        } catch {
          /* ignore */
        }
      }, 2000);
    },
    [stopPolling, applyResults],
  );

  const handleSubmissionUpdate = useCallback(
    (update: SubmissionUpdate) => {
      if (update.submissionId !== activeSubIdRef.current) return;
      if (update.verdict === "RUNNING") {
        setJudging(true);
        setVerdict("RUNNING");
        return;
      }
      applyResults(update.verdict, {
        testResults: update.testResults,
        compileOutput: update.compileOutput,
        executionTime: update.executionTime,
        memoryUsed: update.memoryUsed,
        testsPassed: update.testsPassed,
        testsTotal: update.testsTotal,
      });
      if (isSubmitRef.current)
        triggerAiReviewRef.current(
          update.verdict as string,
          update.testResults || [],
        );
    },
    [applyResults],
  );
  useSubmissionUpdates(handleSubmissionUpdate);

  const handleRun = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!problem) return;
    stopPolling();
    setRunning(true);
    setJudging(true);
    isSubmitRef.current = false;
    setVerdict(null);
    setTestResults([]);
    setCompileOutput(null);
    try {
      const { data } = await api.post("/submissions/run", {
        problemId: problem.id,
        language,
        sourceCode: code,
      });
      setActiveSubmissionId(data.submissionId);
      activeSubIdRef.current = data.submissionId;
      startPolling(data.submissionId);
    } catch (err: any) {
      setRunning(false);
      setJudging(false);
      setCompileOutput(err.response?.data?.error || "Failed to run code");
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!problem) return;
    stopPolling();
    setSubmitting(true);
    setJudging(true);
    isSubmitRef.current = true;
    setVerdict(null);
    setTestResults([]);
    setCompileOutput(null);
    try {
      const { data } = await api.post("/submissions/submit", {
        problemId: problem.id,
        language,
        sourceCode: code,
      });
      setActiveSubmissionId(data.submissionId);
      activeSubIdRef.current = data.submissionId;
      startPolling(data.submissionId);
    } catch (err: any) {
      setSubmitting(false);
      setJudging(false);
      setCompileOutput(err.response?.data?.error || "Failed to submit");
    }
  };

  const handleToggleBookmark = async () => {
    if (!user || !problem) return;
    try {
      const { data } = await api.post("/bookmarks/toggle", {
        problemId: problem.id,
      });
      setBookmarked(data.bookmarked);
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    }
  };

  const handleRevealHint = (index: number) => {
    setRevealedHints((prev) => new Set(prev).add(index));
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center bg-[#0e0e0e]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  if (!problem) return null;

  /* ── Tab button helper ── */
  const Tab = ({
    id,
    label,
    active,
    accent = "zinc",
    dot,
  }: {
    id: string;
    label: string;
    active: boolean;
    accent?: "zinc" | "violet";
    dot?: boolean;
  }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`relative pb-3 text-xs font-medium transition-colors ${
        active ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-400"
      }`}
    >
      <span className="flex items-center gap-1.5">
        {label}
        {dot && (
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
        )}
      </span>
      {active && (
        <span
          className={`absolute bottom-0 left-0 right-0 h-px ${accent === "violet" ? "bg-violet-500" : "bg-zinc-400"}`}
        />
      )}
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-57px)] bg-[#0e0e0e]">
      {/* ════════════════════════════════════════
          LEFT PANEL — Description / Submissions / Review
      ════════════════════════════════════════ */}
      <div className="w-[45%] overflow-y-auto border-r border-white/[0.06]">
        <div className="px-6 py-5">
          {/* Tab bar */}
          <div className="mb-5 flex items-center gap-5 border-b border-white/[0.05]">
            <Tab
              id="description"
              label="Description"
              active={activeTab === "description"}
            />
            <Tab
              id="submissions"
              label="Submissions"
              active={activeTab === "submissions"}
            />
            {(aiReview || aiReviewLoading) && (
              <Tab
                id="review"
                label="AI Review"
                active={activeTab === "review"}
                accent="violet"
                dot={aiReviewLoading}
              />
            )}
          </div>

          {/* ── AI REVIEW TAB ── */}
          {activeTab === "review" && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="h-px w-4 bg-zinc-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  AI Code Review
                </span>
              </div>
              {aiReviewLoading ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <div className="flex gap-1 text-violet-500">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="h-2 w-2 animate-bounce rounded-full bg-current"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-xs text-zinc-700">
                    Analyzing your code…
                  </p>
                </div>
              ) : aiReview ? (
                <pre className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 font-sans text-sm leading-relaxed text-zinc-400 whitespace-pre-wrap">
                  {aiReview}
                </pre>
              ) : (
                <p className="font-mono text-xs text-zinc-700">
                  No review yet. Submit your code to get an AI review.
                </p>
              )}
            </div>
          )}

          {/* ── DESCRIPTION TAB ── */}
          {activeTab === "description" && (
            <>
              {/* Title + bookmark */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <h1 className="text-lg font-light tracking-tight text-zinc-100 leading-snug">
                  {problem.title}
                </h1>
                {user && (
                  <button
                    onClick={handleToggleBookmark}
                    title={bookmarked ? "Remove bookmark" : "Bookmark problem"}
                    className="mt-0.5 shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    <svg
                      className={`h-4 w-4 transition-colors ${bookmarked ? "text-amber-400" : "text-zinc-700 hover:text-zinc-400"}`}
                      fill={bookmarked ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Meta pills */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={problem.difficulty} />
                <span className="inline-flex items-center rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-zinc-500">
                  {problem.timeLimit} ms
                </span>
                <span className="inline-flex items-center rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-zinc-500">
                  {(problem.memoryLimit / 1024).toFixed(0)} MB
                </span>
              </div>

              {/* Description */}
              <pre className="mb-6 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-400">
                {problem.description}
              </pre>

              {/* Constraints */}
              {problem.constraints && (
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-px w-4 bg-zinc-800" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Constraints
                    </span>
                  </div>
                  <pre className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 font-mono text-xs text-zinc-500 whitespace-pre-wrap">
                    {problem.constraints}
                  </pre>
                </div>
              )}

              {/* Examples */}
              {problem.testCases.length > 0 && (
                <div className="mb-6">
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

              {/* Hints */}
              {problem.hints && problem.hints.length > 0 && (
                <div className="mt-2">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-px w-4 bg-zinc-800" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Hints ({problem.hints.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {problem.hints.map((hint, i) => (
                      <div
                        key={hint.id}
                        className="overflow-hidden rounded-xl border border-white/[0.06]"
                      >
                        {revealedHints.has(i) ? (
                          <div className="px-4 py-3 bg-amber-950/20">
                            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-amber-600">
                              Hint {i + 1}
                            </p>
                            <p className="text-sm text-zinc-400">
                              {hint.content}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRevealHint(i)}
                            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                          >
                            <svg
                              className="h-3.5 w-3.5 shrink-0 text-zinc-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            <span className="font-mono text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
                              Reveal hint {i + 1}
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── SUBMISSIONS TAB ── */}
          {activeTab === "submissions" && (
            <div className="space-y-2">
              {userSubmissions.length === 0 ? (
                <div className="flex items-center justify-center py-14">
                  <p className="font-mono text-xs text-zinc-700">
                    No submissions yet.
                  </p>
                </div>
              ) : (
                userSubmissions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold ${VERDICT_COLORS[s.verdict]}`}
                      >
                        {VERDICT_LABELS[s.verdict]}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-600">
                        {s.language}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-700">
                      <span>
                        {s.testsPassed}/{s.testsTotal}
                      </span>
                      {s.executionTime && <span>{s.executionTime}ms</span>}
                      <span>{new Date(s.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
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

      {/* AI Chat Panel */}
      {problem && <AIChatPanel problemId={problem.id} isLoggedIn={!!user} />}
    </div>
  );
}
