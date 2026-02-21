"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

/* ─────────────────────────────────────────────
   Rank badge — gold / silver / bronze / rest
───────────────────────────────────────────── */
function RankBadge({ idx }: { idx: number }) {
  if (idx === 0)
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-900/50 border border-amber-700/50 font-mono text-[11px] font-bold text-amber-400">
        1
      </span>
    );
  if (idx === 1)
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700/40 border border-zinc-600/50 font-mono text-[11px] font-bold text-zinc-300">
        2
      </span>
    );
  if (idx === 2)
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-900/40 border border-orange-800/50 font-mono text-[11px] font-bold text-orange-400">
        3
      </span>
    );
  return <span className="font-mono text-xs text-zinc-600">{idx + 1}</span>;
}

/* ─────────────────────────────────────────────
   Win-rate bar
───────────────────────────────────────────── */
function WinRateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1 w-14 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-zinc-400 transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-[11px] text-zinc-400">
        {rate}%
      </span>
    </div>
  );
}

export default function DuelLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get("/duels/leaderboard");
        setLeaderboard(res.data);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

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
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
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
              Leaderboard.
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Top competitive programmers ranked by duel rating.
            </p>
          </div>
        </div>

        {/* ── TABLE ── */}
        {leaderboard.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02] py-20">
            <p className="font-mono text-xs text-zinc-700">No players yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-5 py-3 text-left w-12">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      #
                    </span>
                  </th>
                  <th className="px-5 py-3 text-left">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Player
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right w-24">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Rating
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right w-20">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Duels
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right w-16">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      W
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right w-16">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      L
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right w-28">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Win Rate
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {leaderboard.map((player, idx) => (
                  <tr
                    key={player.id}
                    className={`border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.03] ${
                      idx < 3 ? "bg-white/[0.01]" : ""
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-5 py-3.5">
                      <RankBadge idx={idx} />
                    </td>

                    {/* Player */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-zinc-200">
                        {player.username}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-700">
                        Joined {new Date(player.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    {/* Rating */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-mono text-sm font-semibold text-violet-400">
                        {player.rating}
                      </span>
                    </td>

                    {/* Total duels */}
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-zinc-500">
                      {player.duelStats.totalDuels}
                    </td>

                    {/* Wins */}
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-medium text-emerald-400">
                      {player.duelStats.wins}
                    </td>

                    {/* Losses */}
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-medium text-red-400">
                      {player.duelStats.losses}
                    </td>

                    {/* Win rate bar */}
                    <td className="px-5 py-3.5">
                      <WinRateBar rate={player.duelStats.winRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
