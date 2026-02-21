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

export default function RoomProblemPage() {
  const { roomId: roomCode, label } = useParams<{
    roomId: string;
    label: string;
  }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [data, setData] = useState<RoomProblemData | null>(null);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [language, setLanguage] = useState<Language>("CPP");
  const [code, setCode] = useState(LANGUAGE_DEFAULTS.CPP);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Results
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
        {
          problemId: data.roomProblem.problem.id,
          language,
          sourceCode: code,
        },
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
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!data) return null;

  const { roomProblem } = data;
  const problem = roomProblem.problem;

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Left Panel — Problem Description */}
      <div className="w-[45%] border-r border-zinc-800 overflow-y-auto">
        <div className="px-6 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
            <Link
              href={`/rooms/${roomCode}`}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              ← Back to Room
            </Link>
            <span className="text-xs text-zinc-500 font-mono">
              {data.roomCode}
            </span>
          </div>

          <h1 className="text-xl font-bold text-white mb-2">
            {roomProblem.label}. {problem.title}
          </h1>
          <div className="flex gap-3 mb-4">
            <span
              className={`text-sm font-medium ${
                DIFFICULTY_COLORS[
                  problem.difficulty as keyof typeof DIFFICULTY_COLORS
                ]
              }`}
            >
              {problem.difficulty}
            </span>
            <span className="text-sm text-zinc-500">
              {roomProblem.points} pts
            </span>
            <span className="text-sm text-zinc-500">
              Time: {problem.timeLimit}ms
            </span>
          </div>

          <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed mb-6">
            {problem.description}
          </pre>

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

          {problem.hints && problem.hints.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">
                Hints
              </h3>
              {problem.hints.map((h) => (
                <details key={h.id} className="mb-2">
                  <summary className="text-sm text-blue-400 cursor-pointer hover:underline">
                    Hint {h.orderIdx + 1}
                  </summary>
                  <p className="text-sm text-zinc-400 mt-1 ml-4">{h.content}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel — Code Editor & Results */}
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
