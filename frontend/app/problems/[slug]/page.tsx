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

export default function ProblemDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Bookmark state
  const [bookmarked, setBookmarked] = useState(false);

  // Hints state
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());

  // Editor state
  const [language, setLanguage] = useState<Language>("CPP");
  const [code, setCode] = useState(LANGUAGE_DEFAULTS.CPP);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isSubmitRef = useRef(false);

  // Results state
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

  // AI Review state
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"description" | "submissions" | "review">(
    "description",
  );

  // Fetch problem
  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get(`/problems/${slug}`);
        setProblem(data.problem);
        setUserSubmissions(data.userSubmissions || []);

        // Check bookmark status if logged in
        if (user) {
          try {
            const bookmarkRes = await api.get(
              `/bookmarks/check/${data.problem.id}`,
            );
            setBookmarked(bookmarkRes.data.bookmarked);
          } catch {
            // Ignore bookmark check errors
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

  // Auto-trigger AI review after judging
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

  // ─── Submission Handling ───────────────────────────────────────────
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

  // Apply final results to UI
  const applyResults = useCallback(
    (v: Verdict, extra: {
      testResults?: TestCaseResult[];
      compileOutput?: string | null;
      executionTime?: number | null;
      memoryUsed?: number | null;
      testsPassed?: number;
      testsTotal?: number;
    }) => {
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

  // Poll GET /submissions/:id until verdict is final
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
            if (isSubmitRef.current) {
              triggerAiReviewRef.current(s.verdict, []);
            }
          }
        } catch { /* ignore */ }
      }, 2000);
    },
    [stopPolling, applyResults],
  );

  // WebSocket bonus — if it delivers faster than polling, great
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
      if (isSubmitRef.current) {
        triggerAiReviewRef.current(update.verdict as string, update.testResults || []);
      }
    },
    [applyResults],
  );

  useSubmissionUpdates(handleSubmissionUpdate);

  // Run Code
  const handleRun = async () => {
    if (!user) { router.push("/login"); return; }
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
        problemId: problem.id, language, sourceCode: code,
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

  // Submit Solution
  const handleSubmit = async () => {
    if (!user) { router.push("/login"); return; }
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
        problemId: problem.id, language, sourceCode: code,
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

  // Toggle Bookmark
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

  // Reveal Hint
  const handleRevealHint = (index: number) => {
    setRevealedHints((prev) => new Set(prev).add(index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <p className="text-zinc-500">Loading problem...</p>
      </div>
    );
  }

  if (!problem) return null;

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Left Panel — Problem Description */}
      <div className="w-[45%] border-r border-zinc-800 overflow-y-auto">
        <div className="px-6 py-4">
          {/* Tabs */}
          <div className="flex gap-4 border-b border-zinc-800 mb-4">
            <button
              onClick={() => setActiveTab("description")}
              className={`pb-2 text-sm font-medium transition-colors ${activeTab === "description"
                ? "text-white border-b-2 border-blue-500"
                : "text-zinc-400 hover:text-white"
                }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`pb-2 text-sm font-medium transition-colors ${activeTab === "submissions"
                ? "text-white border-b-2 border-blue-500"
                : "text-zinc-400 hover:text-white"
                }`}
            >
              Submissions
            </button>
            {(aiReview || aiReviewLoading) && (
              <button
                onClick={() => setActiveTab("review")}
                className={`pb-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === "review"
                  ? "text-white border-b-2 border-purple-500"
                  : "text-zinc-400 hover:text-white"
                  }`}
              >
                🤖 AI Review
                {aiReviewLoading && (
                  <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                )}
              </button>
            )}
          </div>

          {activeTab === "review" ? (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                🤖 AI Code Review
              </h2>
              {aiReviewLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="flex gap-1.5 text-purple-400">
                    <span className="animate-bounce text-lg" style={{ animationDelay: "0ms" }}>●</span>
                    <span className="animate-bounce text-lg" style={{ animationDelay: "150ms" }}>●</span>
                    <span className="animate-bounce text-lg" style={{ animationDelay: "300ms" }}>●</span>
                  </div>
                  <p className="text-sm text-zinc-500">Analyzing your code...</p>
                </div>
              ) : aiReview ? (
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                  {aiReview}
                </pre>
              ) : (
                <p className="text-sm text-zinc-500">No review available yet. Submit your code to get an AI review.</p>
              )}
            </div>
          ) : activeTab === "description" ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-xl font-bold text-white">
                  {problem.title}
                </h1>
                {user && (
                  <button
                    onClick={handleToggleBookmark}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                    title={bookmarked ? "Remove bookmark" : "Bookmark problem"}
                  >
                    <svg
                      className={`h-5 w-5 ${bookmarked
                        ? "text-yellow-400"
                        : "text-zinc-500 hover:text-zinc-300"
                        }`}
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
              <div className="flex gap-3 mb-4">
                <span
                  className={`text-sm font-medium ${DIFFICULTY_COLORS[problem.difficulty]
                    }`}
                >
                  {problem.difficulty}
                </span>
                <span className="text-sm text-zinc-500">
                  Time: {problem.timeLimit}ms
                </span>
                <span className="text-sm text-zinc-500">
                  Memory: {(problem.memoryLimit / 1024).toFixed(0)}MB
                </span>
              </div>

              <div className="prose prose-invert prose-sm max-w-none mb-6">
                <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed">
                  {problem.description}
                </pre>
              </div>

              {problem.constraints && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2">
                    Constraints
                  </h3>
                  <pre className="text-sm text-zinc-400 bg-zinc-900 p-3 rounded whitespace-pre-wrap">
                    {problem.constraints}
                  </pre>
                </div>
              )}

              {/* Sample Test Cases */}
              {problem.testCases.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                    Examples
                  </h3>
                  {problem.testCases.map((tc, i) => (
                    <div
                      key={tc.id}
                      className="mb-4 rounded border border-zinc-800 overflow-hidden"
                    >
                      <div className="bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 font-medium">
                        Example {i + 1}
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-zinc-800">
                        <div className="p-3">
                          <p className="text-xs text-zinc-500 mb-1">Input</p>
                          <pre className="text-sm text-zinc-300 whitespace-pre-wrap">
                            {tc.input}
                          </pre>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-zinc-500 mb-1">Output</p>
                          <pre className="text-sm text-zinc-300 whitespace-pre-wrap">
                            {tc.output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Hints Section */}
              {problem.hints && problem.hints.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-yellow-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Hints ({problem.hints.length})
                  </h3>
                  <div className="space-y-2">
                    {problem.hints.map((hint, i) => (
                      <div
                        key={hint.id}
                        className="rounded border border-zinc-800 overflow-hidden"
                      >
                        {revealedHints.has(i) ? (
                          <div className="px-4 py-3 bg-zinc-900/50">
                            <p className="text-xs text-yellow-500 mb-1 font-medium">
                              Hint {i + 1}
                            </p>
                            <p className="text-sm text-zinc-300">
                              {hint.content}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRevealHint(i)}
                            className="w-full px-4 py-3 text-left text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 transition-colors flex items-center gap-2"
                          >
                            <svg
                              className="h-4 w-4"
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
                            Click to reveal Hint {i + 1}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {userSubmissions.length === 0 ? (
                <p className="text-zinc-500 text-sm">No submissions yet.</p>
              ) : (
                userSubmissions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded border border-zinc-800 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-medium ${VERDICT_COLORS[s.verdict]
                          }`}
                      >
                        {VERDICT_LABELS[s.verdict]}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {s.language}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
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

      {/* Right Panel — Editor + Results */}
      <div className="flex-1 flex flex-col">
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
          />
        </div>

        {/* Results Panel */}
        <div className="h-[35%] overflow-y-auto border-t border-zinc-800">
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
