"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useContestRoom } from "@/lib/socket";
import type { ScoreboardRow } from "@/lib/types";

interface ScoreboardData {
  contestId: string;
  problems: { id: string; label: string; problemId: string; points: number }[];
  scoreboard: ScoreboardRow[];
}

/* ─────────────────────────────────────────────
   Rank badge — gold / silver / bronze for top 3
───────────────────────────────────────────── */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-900/50 border border-amber-700/50 font-mono text-[11px] font-bold text-amber-400">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700/40 border border-zinc-600/50 font-mono text-[11px] font-bold text-zinc-300">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-900/40 border border-orange-800/50 font-mono text-[11px] font-bold text-orange-400">
        3
      </span>
    );
  return <span className="font-mono text-xs text-zinc-600">{rank}</span>;
}

export default function ScoreboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ScoreboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useContestRoom(data?.contestId ?? null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get(`/contests/${slug}/scoreboard`);
        setData(data);
      } catch (err) {
        console.error("Failed to fetch scoreboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [slug]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center bg-[#0e0e0e]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  /* ── Error ── */
  if (!data) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center bg-[#0e0e0e]">
        <p className="font-mono text-xs text-zinc-700">
          Failed to load scoreboard.
        </p>
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
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            {/* Back link */}
            <div className="mb-2 flex items-center gap-2">
              <Link
                href={`/contests/${slug}`}
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
                Back to Contest
              </Link>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-100">
              Scoreboard.
            </h1>
          </div>

          {/* Auto-refresh indicator */}
          {/* <div className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] text-zinc-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Refreshes every 30s
          </div> */}
        </div>

        {/* ── TAB NAV ── */}
        <div className="mb-8 flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 w-fit">
          <Link
            href={`/contests/${slug}`}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-all"
          >
            Problems
          </Link>
          <Link
            href={`/contests/${slug}/scoreboard`}
            className="rounded-lg px-4 py-1.5 text-xs font-medium bg-white/[0.08] text-zinc-100 transition-all"
          >
            Scoreboard
          </Link>
        </div>

        {/* ── TABLE ── */}
        <div className="rounded-2xl border border-white/[0.07] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-5 py-3 text-left w-14">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    #
                  </span>
                </th>
                <th className="px-5 py-3 text-left">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    User
                  </span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    Score
                  </span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    Penalty
                  </span>
                </th>
                {data.problems.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center w-16">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      {p.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.scoreboard.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + data.problems.length}
                    className="px-5 py-14 text-center font-mono text-xs text-zinc-700"
                  >
                    No participants yet.
                  </td>
                </tr>
              ) : (
                data.scoreboard.map((row) => (
                  <tr
                    key={row.user.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Rank */}
                    <td className="px-5 py-3.5">
                      <RankBadge rank={row.rank} />
                    </td>

                    {/* User */}
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-zinc-200 text-[16px]">
                        {row.user.username}
                      </span>
                      <span className="ml-2 font-mono text-[15px] text-zinc-600">
                        {row.user.rating}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-mono text-sm font-semibold text-zinc-100">
                        {row.score}
                      </span>
                    </td>

                    {/* Penalty */}
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-zinc-600">
                      {Math.floor(row.penalty / 60)}m
                    </td>

                    {/* Per-problem solved cells */}
                    {row.solvedProblems.map((sp) => (
                      <td key={sp.label} className="px-4 py-3.5 text-center">
                        {sp.solved ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-900/50 border border-emerald-800/60 mx-auto">
                            <svg
                              className="h-3 w-3 text-emerald-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        ) : (
                          <span className="font-mono text-zinc-800">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
