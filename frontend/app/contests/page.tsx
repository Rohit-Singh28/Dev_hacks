"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Contest, WeeklyContest } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [weeklyContests, setWeeklyContests] = useState<WeeklyContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    async function fetchData() {
      try {
        const params: any = {};
        if (filter !== "ALL") params.status = filter;

        const [contestsRes, weeklyRes] = await Promise.all([
          api.get("/contests", { params }),
          fetch(`${API_BASE}/api/weekly-contests`).then((r) => r.json()),
        ]);

        setContests(contestsRes.data.contests);
        setWeeklyContests(weeklyRes.contests || []);
      } catch (err) {
        console.error("Failed to fetch contests:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filter]);

  const statusConfig: Record<
    string,
    { pill: string; dot: string; label: string }
  > = {
    UPCOMING: {
      pill: "bg-sky-900/40 text-sky-400 border border-sky-800/50",
      dot: "bg-sky-400",
      label: "Upcoming",
    },
    ACTIVE: {
      pill: "bg-emerald-900/40 text-emerald-400 border border-emerald-800/50",
      dot: "bg-emerald-400",
      label: "Active",
    },
    ENDED: {
      pill: "bg-white/[0.04] text-zinc-500 border border-white/[0.07]",
      dot: "bg-zinc-600",
      label: "Ended",
    },
  };

  const diffColor: Record<string, string> = {
    EASY: "from-emerald-600/20 via-emerald-500/10",
    MEDIUM: "from-amber-600/20 via-amber-500/10",
    HARD: "from-red-600/20 via-red-500/10",
  };

  const diffBadge: Record<string, string> = {
    EASY: "bg-emerald-900/60 text-emerald-400 border-emerald-700/50",
    MEDIUM: "bg-amber-900/60 text-amber-400 border-amber-700/50",
    HARD: "bg-red-900/60 text-red-400 border-red-700/50",
  };

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
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-px w-5 bg-zinc-700" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Compete
              </span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-100">
              Contests.
            </h1>
          </div>

          {/* Filter pills */}
          <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
            {["ALL", "UPCOMING", "ACTIVE", "ENDED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${filter === s
                    ? "bg-white/[0.08] text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                  }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── WEEKLY CONTESTS SECTION ── */}
        {weeklyContests.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-amber-500/80 font-semibold">
                Weekly Contests
              </span>
            </div>

            <div className="space-y-3">
              {weeklyContests.map((wc) => {
                const now = new Date();
                const end = new Date(wc.endDate);
                const daysLeft = Math.max(
                  0,
                  Math.ceil(
                    (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  )
                );
                const gradient = diffColor[wc.difficulty] || diffColor.MEDIUM;
                const badge = diffBadge[wc.difficulty] || diffBadge.MEDIUM;

                return (
                  <div
                    key={wc.id}
                    className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r ${gradient} to-transparent p-6 transition-all hover:border-white/[0.14] shadow-lg`}
                  >
                    {/* Animated background */}
                    <div className="absolute inset-0 opacity-30 pointer-events-none">
                      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/[0.03] animate-pulse" />
                    </div>

                    <div className="relative">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-semibold text-zinc-100">
                            {wc.title}
                          </h2>
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold border ${badge}`}
                          >
                            {wc.difficulty}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-900/40 border border-amber-800/50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                            <svg
                              className="h-3 w-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Weekly
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {wc.description && (
                        <p className="text-sm text-zinc-500 mb-3 line-clamp-2">
                          {wc.description}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-zinc-600">
                        <span className="flex items-center gap-1.5">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {new Date(wc.startDate).toLocaleString()}
                        </span>
                        <span className="text-zinc-800">→</span>
                        <span>{new Date(wc.endDate).toLocaleString()}</span>
                        <span className="ml-auto flex items-center gap-1.5 text-amber-500/80">
                          ⏳ {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                        </span>
                        {wc.prizes && (
                          <span className="flex items-center gap-1.5 text-amber-500/80">
                            🏆 {wc.prizes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="mt-8 mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-700">
                Platform Contests
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
          </div>
        )}

        {/* ── REGULAR CONTESTS ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
          </div>
        ) : contests.length === 0 && weeklyContests.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="font-mono text-xs text-zinc-700">
              No contests found.
            </p>
          </div>
        ) : contests.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="font-mono text-xs text-zinc-700">
              No platform contests found.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contests.map((c) => {
              const cfg = statusConfig[c.status] ?? statusConfig.ENDED;
              return (
                <Link
                  key={c.id}
                  href={`/contests/${c.slug}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04] hover:border-white/[0.12]"
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-base font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug">
                      {c.title}
                    </h2>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.pill}`}
                    >
                      {/* Pulse dot for ACTIVE */}
                      {c.status === "ACTIVE" ? (
                        <span className="relative flex h-1.5 w-1.5">
                          <span
                            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${cfg.dot}`}
                          />
                          <span
                            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                          />
                        </span>
                      ) : (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                        />
                      )}
                      {cfg.label}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-zinc-600">
                    <span className="flex items-center gap-1.5">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {new Date(c.startTime).toLocaleString()}
                    </span>
                    <span className="text-zinc-800">→</span>
                    <span>{new Date(c.endTime).toLocaleString()}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {c._count?.contestParticipants ?? 0} participants
                    </span>
                  </div>

                  {/* Bottom accent line */}
                  <div className="h-px w-full bg-gradient-to-r from-white/[0.04] to-transparent" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
