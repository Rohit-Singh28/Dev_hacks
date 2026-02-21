"use client";

import type { TestCaseResult, Verdict } from "@/lib/types";
import { VERDICT_COLORS, VERDICT_LABELS } from "@/lib/constants";

interface ResultsPanelProps {
  verdict: Verdict | null;
  testResults: TestCaseResult[];
  compileOutput: string | null;
  executionTime: number | null;
  memoryUsed: number | null;
  testsPassed: number;
  testsTotal: number;
  loading: boolean;
}

export default function ResultsPanel({
  verdict,
  testResults,
  compileOutput,
  executionTime,
  memoryUsed,
  testsPassed,
  testsTotal,
  loading,
}: ResultsPanelProps) {
  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
        <div className="flex items-center gap-2 text-yellow-400 text-sm">
          <span className="animate-pulse">●</span>
          <span>Judging...</span>
        </div>
      </div>
    );
  }

  if (!verdict) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
        <p className="text-zinc-500 text-sm">
          Run your code or submit to see results.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Verdict Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`font-semibold ${VERDICT_COLORS[verdict]}`}>
            {VERDICT_LABELS[verdict]}
          </span>
          <span className="text-zinc-500 text-sm">
            {testsPassed}/{testsTotal} passed
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          {executionTime !== null && <span>⏱ {executionTime}ms</span>}
          {memoryUsed !== null && (
            <span>💾 {(memoryUsed / 1024).toFixed(1)}MB</span>
          )}
        </div>
      </div>

      {/* Compile Error */}
      {compileOutput && (
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-sm text-red-400 font-medium mb-1">
            Compilation Error:
          </p>
          <pre className="text-xs text-red-300 bg-zinc-950 p-3 rounded overflow-x-auto whitespace-pre-wrap">
            {compileOutput}
          </pre>
        </div>
      )}

      {/* Test Case Results */}
      {testResults.length > 0 && (
        <div className="divide-y divide-zinc-800">
          {testResults.map((tc) => (
            <div key={tc.index} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-sm font-medium ${
                    tc.passed ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {tc.passed ? "✓" : "✗"} Test Case {tc.index + 1}
                </span>
                {tc.isHidden && (
                  <span className="text-xs bg-zinc-800 text-zinc-400 rounded px-2 py-0.5">
                    Hidden
                  </span>
                )}
                {tc.time && (
                  <span className="text-xs text-zinc-500">
                    {(parseFloat(tc.time) * 1000).toFixed(0)}ms
                  </span>
                )}
              </div>

              {!tc.isHidden && (
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-zinc-500 mb-1">Input</p>
                    <pre className="bg-zinc-950 p-2 rounded text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                      {tc.input}
                    </pre>
                  </div>
                  <div>
                    <p className="text-zinc-500 mb-1">Expected</p>
                    <pre className="bg-zinc-950 p-2 rounded text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                      {tc.expectedOutput}
                    </pre>
                  </div>
                  <div>
                    <p className="text-zinc-500 mb-1">Output</p>
                    <pre
                      className={`bg-zinc-950 p-2 rounded overflow-x-auto whitespace-pre-wrap ${
                        tc.passed ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {tc.actualOutput ?? "(no output)"}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
