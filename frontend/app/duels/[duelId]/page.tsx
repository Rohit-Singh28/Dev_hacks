"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSocket, useSubmissionUpdates } from "@/lib/socket";
import { useAuthStore } from "@/lib/authStore";
import CodeEditor from "@/components/CodeEditor";
import ResultsPanel from "@/components/ResultsPanel";
import { DIFFICULTY_COLORS, LANGUAGE_DEFAULTS } from "@/lib/constants";
import type { Language, Verdict, TestCaseResult, SubmissionUpdate } from "@/lib/types";

export default function DuelArena() {
  const router = useRouter();
  const params = useParams();
  const duelId = params.duelId as string;
  const { user } = useAuthStore();

  // Duel state
  const [duel, setDuel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [duelEnded, setDuelEnded] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Multi-problem state
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set());

  // Per-problem editor state
  const [codeByProblem, setCodeByProblem] = useState<Record<string, string>>({});
  const [languageByProblem, setLanguageByProblem] = useState<Record<string, Language>>({});

  // Submission state
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Results state
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [compileOutput, setCompileOutput] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [memoryUsed, setMemoryUsed] = useState<number | null>(null);
  const [testsPassed, setTestsPassed] = useState(0);
  const [testsTotal, setTestsTotal] = useState(0);
  const [judging, setJudging] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  const timerIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Fetch duel details
  useEffect(() => {
    const fetchDuel = async () => {
      try {
        const res = await api.get(`/duels/${duelId}`);
        setDuel(res.data);

        // Initialize per-problem code/language
        const initCode: Record<string, string> = {};
        const initLang: Record<string, Language> = {};
        const initSolved = new Set<string>();

        for (const prob of res.data.problems || []) {
          initCode[prob.id] = LANGUAGE_DEFAULTS.CPP;
          initLang[prob.id] = "CPP";
        }

        // Check already solved problems
        const me = res.data.participants?.find((p: any) => p.userId === user?.id);
        if (me?.submissions) {
          for (const s of me.submissions) {
            if (s.solved) initSolved.add(s.problemId);
          }
        }

        setCodeByProblem(initCode);
        setLanguageByProblem(initLang);
        setSolvedProblems(initSolved);

        // Calculate time remaining
        if (res.data.startedAt) {
          const timerMsMap: Record<string, number> = {
            TEN_MINS: 10 * 60 * 1000,
            THIRTY_MINS: 30 * 60 * 1000,
            ONE_HOUR: 60 * 60 * 1000,
          };
          const timerMs = timerMsMap[res.data.timerOption] || 0;
          const elapsedTime = Date.now() - new Date(res.data.startedAt).getTime();
          const remaining = Math.max(0, timerMs - elapsedTime);
          setTimeRemaining(remaining);
        }

        if (res.data.status === "COMPLETED") {
          setDuelEnded(true);
          setResult(res.data);
        }
      } catch (err) {
        console.error("Error fetching duel:", err);
        router.push("/duels");
      } finally {
        setLoading(false);
      }
    };

    fetchDuel();
  }, [duelId, router, user?.id]);

  // WebSocket setup
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !duelId) return;

    socket.emit("duel:join", duelId);

    const handleDuelEnded = (result: any) => {
      setDuelEnded(true);
      setResult(result);
    };

    socket.on("duel:ended", handleDuelEnded);

    return () => {
      socket.emit("duel:leave", duelId);
      socket.off("duel:ended", handleDuelEnded);
    };
  }, [duelId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining === 0) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => (prev ? Math.max(0, prev - 1000) : 0));
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [timeRemaining]);

  // Auto-end duel when time runs out
  useEffect(() => {
    if (timeRemaining === 0 && !duelEnded) {
      handleEndDuel();
    }
  }, [timeRemaining, duelEnded]);

  const handleEndDuel = async () => {
    try {
      const res = await api.post(`/duels/${duelId}/end`);
      setDuelEnded(true);
      setResult(res.data);
    } catch (err) {
      console.error("Error ending duel:", err);
      try {
        const res = await api.get(`/duels/${duelId}`);
        setDuelEnded(true);
        setResult(res.data);
      } catch (_) { }
    }
  };

  // Handle submission update from WebSocket
  const handleSubmissionUpdate = useCallback(
    (update: SubmissionUpdate) => {
      if (update.submissionId !== activeSubmissionId) return;
      setVerdict(update.verdict as Verdict);
      setTestResults(update.testResults || []);
      setCompileOutput(update.compileOutput || null);
      setExecutionTime(update.executionTime || null);
      setMemoryUsed(update.memoryUsed || null);
      setTestsPassed(update.testsPassed || 0);
      setTestsTotal(update.testsTotal || 0);
      setJudging(false);
      setSubmitting(false);

      // If accepted, mark problem as solved
      if (update.verdict === "ACCEPTED") {
        const currentProblem = duel?.problems?.[activeProblemIdx];
        if (currentProblem) {
          setSolvedProblems((prev) => new Set(prev).add(currentProblem.id));

          // Check if all problems are now solved → refresh duel to check win
          const totalProblems = duel?.problems?.length || 0;
          const newSolvedCount = solvedProblems.size + 1;
          if (newSolvedCount >= totalProblems) {
            // All solved — we may have won! Re-fetch duel status
            setTimeout(async () => {
              try {
                const res = await api.get(`/duels/${duelId}`);
                if (res.data.status === "COMPLETED") {
                  setDuelEnded(true);
                  setResult(res.data);
                }
              } catch (_) { }
            }, 1000);
          }
        }
      }
    },
    [activeSubmissionId, duel, activeProblemIdx, solvedProblems, duelId],
  );

  useSubmissionUpdates(handleSubmissionUpdate);

  // Submit code handler
  const handleSubmit = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!duel) return;

    const currentProblem = duel.problems[activeProblemIdx];
    if (!currentProblem) return;

    const problemId = currentProblem.id;
    const language = languageByProblem[problemId] || "CPP";
    const code = codeByProblem[problemId] || "";

    setSubmitting(true);
    setJudging(true);
    setVerdict(null);
    setTestResults([]);
    setCompileOutput(null);

    try {
      const res = await api.post(`/duels/${duelId}/submit`, {
        duelId,
        problemId,
        language,
        sourceCode: code,
      });

      if (res.data.submissionId) {
        setActiveSubmissionId(res.data.submissionId);
      }

      if (res.data.duelComplete) {
        setDuelEnded(true);
        setResult(res.data.result);
        setSubmitting(false);
        setJudging(false);
      }
    } catch (err: any) {
      setSubmitting(false);
      setJudging(false);
      setCompileOutput(err.response?.data?.error || "Failed to submit code");
    }
  };

  const handleRun = async () => {
    await handleSubmit();
  };

  // Forfeit handler
  const handleForfeit = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to quit? Your opponent will win automatically and you will lose rating points."
    );
    if (!confirmed) return;

    try {
      const res = await api.post(`/duels/${duelId}/forfeit`);
      setDuelEnded(true);
      setResult(res.data);
    } catch (err: any) {
      console.error("Error forfeiting duel:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <p className="text-zinc-500">Loading duel...</p>
      </div>
    );
  }

  if (duelEnded && result) {
    return <DuelResults duel={result} userId={user?.id} />;
  }

  if (!duel) return null;

  const timeParts = timeRemaining
    ? [
      Math.floor(timeRemaining / 3600000),
      Math.floor((timeRemaining % 3600000) / 60000),
      Math.floor((timeRemaining % 60000) / 1000),
    ]
    : [0, 0, 0];

  const problems = duel.problems || [];
  const currentProblem = problems[activeProblemIdx];
  const opponent = duel.participants.find((p: any) => p.userId !== user?.id);
  const currentProblemId = currentProblem?.id;
  const currentCode = codeByProblem[currentProblemId] || "";
  const currentLanguage = languageByProblem[currentProblemId] || "CPP";

  return (
    <div className="flex h-[calc(100vh-57px)] relative">
      {/* Left Panel - Problem Description */}
      <div className="w-[45%] border-r border-zinc-800 overflow-y-auto">
        <div className="px-6 py-4">
          {/* Duel Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <Link href="/duels" className="text-sm text-zinc-400 hover:text-white transition-colors">
                ← Back
              </Link>
              <button
                onClick={handleForfeit}
                className="rounded bg-red-600/20 border border-red-800 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-600/40 hover:text-red-300 transition-colors"
              >
                ✕ Quit
              </button>
            </div>
            <div className="flex items-center gap-4">
              {/* Progress */}
              <div className="text-sm font-medium text-zinc-300">
                <span className="text-green-400">{solvedProblems.size}</span>
                <span className="text-zinc-500">/{problems.length} solved</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-purple-400">
                  {String(timeParts[0]).padStart(2, "0")}:{String(timeParts[1]).padStart(2, "0")}:
                  {String(timeParts[2]).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>

          {/* Opponent Info */}
          <div className="mb-4 p-2 rounded border border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400">vs </span>
              <span className="text-sm font-semibold text-white">{opponent?.username}</span>
            </div>
            <span className="text-xs text-zinc-500">Rating: {opponent?.ratingBefore}</span>
          </div>

          {/* Problem Tabs */}
          <div className="flex gap-2 mb-4">
            {problems.map((prob: any, idx: number) => {
              const isSolved = solvedProblems.has(prob.id);
              return (
                <button
                  key={prob.id}
                  onClick={() => {
                    setActiveProblemIdx(idx);
                    // Clear results when switching
                    setVerdict(null);
                    setTestResults([]);
                    setCompileOutput(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${idx === activeProblemIdx
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                >
                  {isSolved && <span className="mr-1">✓</span>}
                  {prob.label}
                  <span className={`ml-1 text-xs ${prob.difficulty === "EASY" ? "text-green-400" :
                      prob.difficulty === "MEDIUM" ? "text-yellow-400" :
                        "text-red-400"
                    }`}>
                    ({prob.difficulty})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Problem */}
          {currentProblem && (
            <>
              <h1 className="text-xl font-bold text-white mb-2">{currentProblem.title}</h1>
              <div className="flex gap-3 mb-4">
                <span
                  className={`text-sm font-medium ${DIFFICULTY_COLORS[currentProblem.difficulty as keyof typeof DIFFICULTY_COLORS]
                    }`}
                >
                  {currentProblem.difficulty}
                </span>
                <span className="text-sm text-zinc-500">
                  Time: {currentProblem.timeLimit}ms
                </span>
              </div>

              <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed mb-6">
                {currentProblem.description}
              </pre>

              {currentProblem.constraints && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2">Constraints</h3>
                  <pre className="text-sm text-zinc-400 bg-zinc-900 p-3 rounded whitespace-pre-wrap">
                    {currentProblem.constraints}
                  </pre>
                </div>
              )}

              {currentProblem.testCases && currentProblem.testCases.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">Examples</h3>
                  {currentProblem.testCases.map((tc: any, i: number) => (
                    <div key={tc.id} className="mb-4 rounded border border-zinc-800 overflow-hidden">
                      <div className="bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 font-medium">
                        Example {i + 1}
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-zinc-800">
                        <div className="p-3">
                          <p className="text-xs text-zinc-500 mb-1">Input</p>
                          <pre className="text-sm text-zinc-300 whitespace-pre-wrap">{tc.input}</pre>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-zinc-500 mb-1">Output</p>
                          <pre className="text-sm text-zinc-300 whitespace-pre-wrap">{tc.output}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Editor & Results */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 min-h-0">
          <CodeEditor
            language={currentLanguage}
            onLanguageChange={(lang) =>
              setLanguageByProblem((prev) => ({ ...prev, [currentProblemId]: lang }))
            }
            code={currentCode}
            onCodeChange={(code) =>
              setCodeByProblem((prev) => ({ ...prev, [currentProblemId]: code }))
            }
            onRun={handleRun}
            onSubmit={handleSubmit}
            running={running}
            submitting={submitting}
          />
        </div>
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
    </div>
  );
}

function DuelResults({ duel, userId }: { duel: any; userId?: string }) {
  const router = useRouter();
  const participants = duel.participants || [];
  const participant1 = participants[0];
  const participant2 = participants[1];
  const winner =
    participant1?.isWinner === true
      ? participant1
      : participant2?.isWinner === true
        ? participant2
        : null;

  const isWinner = winner?.userId === userId;

  return (
    <div className="flex h-[calc(100vh-57px)] items-center justify-center">
      <div className="max-w-2xl w-full mx-auto px-6">
        <div className="rounded-lg p-8 border border-zinc-800 bg-zinc-900 text-center">
          <div className="mb-6">
            {isWinner ? (
              <div className="text-6xl mb-4">🏆</div>
            ) : winner ? (
              <div className="text-6xl mb-4">💔</div>
            ) : (
              <div className="text-6xl mb-4">🤝</div>
            )}
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            {isWinner ? "You Won!" : winner ? "You Lost" : "Draw"}
          </h1>

          <div className="grid grid-cols-2 gap-4 my-8">
            {participants.map((p: any) => (
              <div
                key={p.userId}
                className={`p-4 rounded border ${p.isWinner === true
                    ? "bg-green-950 border-green-800"
                    : "bg-zinc-800 border-zinc-700"
                  }`}
              >
                <h3 className="font-bold mb-3 text-white">{p.username}</h3>
                <div className="text-sm space-y-2 text-zinc-300">
                  <div className="flex justify-between">
                    <span>Problems Solved:</span>
                    <span className="font-medium">
                      {p.submissions?.filter((s: any) => s.solved).length || 0}
                      /{duel.problems?.length || 0}
                    </span>
                  </div>
                  {p.ratingAfter !== null && p.ratingAfter !== undefined && (
                    <div className="flex justify-between pt-2 border-t border-zinc-700">
                      <span>Rating</span>
                      <span>
                        {p.ratingBefore} → {p.ratingAfter}
                        {p.ratingAfter > p.ratingBefore ? (
                          <span className="text-green-400 ml-1">+{p.ratingAfter - p.ratingBefore}</span>
                        ) : p.ratingAfter < p.ratingBefore ? (
                          <span className="text-red-400 ml-1">{p.ratingAfter - p.ratingBefore}</span>
                        ) : null}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push("/duels")}
              className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Back to Queue
            </button>
            <button
              onClick={() => router.push("/duels/history")}
              className="flex-1 rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
