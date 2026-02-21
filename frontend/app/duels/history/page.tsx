"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

/* ─────────────────────────────────────────────
   Difficulty badge (inline, small)
───────────────────────────────────────────── */
function DifficultyPill({
  difficulty,
  label,
}: {
  difficulty: string;
  label: string;
}) {
  const map: Record<string, string> = {
    EASY: "bg-emerald-900/50 text-emerald-400 border border-emerald-800/60",
    MEDIUM: "bg-amber-900/50   text-amber-400   border border-amber-800/60",
    HARD: "bg-red-900/50     text-red-400     border border-red-800/60",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${map[difficulty] ?? map.HARD}`}
    >
      {label}: {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Result badge
───────────────────────────────────────────── */
function ResultBadge({
  isWinner,
  isDraw,
}: {
  isWinner: boolean;
  isDraw: boolean;
}) {
  if (isWinner)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/50 bg-emerald-900/30 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-400">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Victory
      </span>
    );
  if (isDraw)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/50 bg-amber-900/30 px-3 py-1 font-mono text-[11px] font-semibold text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Draw
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-900/50 bg-red-950/30 px-3 py-1 font-mono text-[11px] font-semibold text-red-400">
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
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
      Defeat
    </span>
  );
}

/* ─────────────────────────────────────────────
   Timer label
───────────────────────────────────────────── */
function timerLabel(timerOption: string) {
  if (timerOption === "TEN_MINS") return "10 min";
  if (timerOption === "THIRTY_MINS") return "30 min";
  return "1 hour";
}

export default function DuelHistory() {
  const [duels, setDuels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/duels/history", {
          params: { page, limit: 20 },
        });
        setDuels(res.data.duels);
        setPagination(res.data.pagination);
      } catch (err) {
        console.error("Error fetching duel history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [page]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center bg-[#0e0e0e]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-zinc-100 font-sans antialiased">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-8 py-12 lg:px-16">
        {/* ── PAGE HEADER ── */}
        <div className="mb-10">
          <div className="mb-2 flex items-center gap-2">
            <Link
              href="/duels"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <svg
                className="h-2.5 w-2.5"
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
              Duels
            </Link>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-zinc-100">
            Match{" "}
            <em
              className="not-italic text-zinc-400"
              style={{ fontFamily: "Georgia, serif" }}
            >
              history
            </em>
            .
          </h1>
          <p className="mt-1 text-sm text-zinc-600">Your past 1v1 matches.</p>
        </div>

        {/* ── EMPTY STATE ── */}
        {duels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02] py-20 text-center">
            <svg
              className="mb-4 h-8 w-8 text-zinc-800"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
            <p className="mb-5 font-mono text-xs text-zinc-700">
              No duels yet. Start your first match!
            </p>
            <Link
              href="/duels"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10"
            >
              Find an Opponent →
            </Link>
          </div>
        ) : (
          <>
            {/* ── HISTORY LIST ── */}
            <div className="mb-8 space-y-3">
              {duels.map((duel) => {
                const currentUserParticipant = duel.participants[0];
                const isWinner = currentUserParticipant?.isWinner === true;
                const isDraw = !duel.participants.some(
                  (p: any) => p.isWinner === true,
                );

                return (
                  <div
                    key={duel.id}
                    className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04] hover:border-white/[0.12]"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-center">
                      {/* Problem pills + date */}
                      <div>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {(duel.problems || []).map((prob: any) => (
                            <DifficultyPill
                              key={prob.id}
                              difficulty={prob.difficulty}
                              label={prob.label}
                            />
                          ))}
                        </div>
                        <span className="font-mono text-[10px] text-zinc-700">
                          {duel.startedAt
                            ? new Date(duel.startedAt).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>

                      {/* Participants */}
                      <div className="space-y-1.5">
                        {duel.participants.map((p: any) => {
                          const solved =
                            p.submissions?.filter((s: any) => s.solved)
                              .length || 0;
                          const total = (duel.problems || []).length;
                          const allSolved = solved === total && total > 0;
                          return (
                            <div
                              key={p.userId}
                              className="flex items-center justify-between gap-3"
                            >
                              <span className="text-xs text-zinc-400">
                                {p.username}
                              </span>
                              <span
                                className={`font-mono text-xs font-medium ${allSolved ? "text-emerald-400" : "text-zinc-600"}`}
                              >
                                {solved}/{total}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Timer */}
                      <div className="flex md:justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 font-mono text-[10px] text-zinc-600">
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
                              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {timerLabel(duel.timerOption)}
                        </span>
                      </div>

                      {/* Result */}
                      <div className="flex md:justify-end">
                        <ResultBadge isWinner={isWinner} isDraw={isDraw} />
                      </div>
                    </div>

                    {/* Bottom accent */}
                    <div className="mt-4 h-px w-full bg-gradient-to-r from-white/[0.04] to-transparent" />
                  </div>
                );
              })}
            </div>

            {/* ── PAGINATION ── */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-xs text-zinc-500 transition-all hover:border-white/[0.12] hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ← Prev
                </button>

                {Array.from(
                  { length: Math.min(pagination.totalPages, 5) },
                  (_, i) => {
                    const startPage = Math.max(1, page - 2);
                    return startPage + i;
                  },
                ).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      page === p
                        ? "bg-white/[0.08] text-zinc-100 border border-white/[0.12]"
                        : "border border-white/[0.07] text-zinc-600 hover:border-white/[0.12] hover:text-zinc-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() =>
                    setPage(Math.min(pagination.totalPages, page + 1))
                  }
                  disabled={page === pagination.totalPages}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-xs text-zinc-500 transition-all hover:border-white/[0.12] hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
