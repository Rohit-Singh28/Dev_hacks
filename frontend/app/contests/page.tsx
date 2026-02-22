"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Contest } from "@/lib/types";

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    async function fetchData() {
      try {
        const params: any = {};
        if (filter !== "ALL") params.status = filter;

        const contestsRes = await api.get("/contests", { params });
        setContests(contestsRes.data.contests);
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
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                  filter === s
                    ? "bg-white/[0.08] text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTESTS ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
          </div>
        ) : contests.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="font-mono text-xs text-zinc-700">
              No contests found.
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
