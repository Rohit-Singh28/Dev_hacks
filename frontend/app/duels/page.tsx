"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/authStore";

type TimerOption = "TEN_MINS" | "THIRTY_MINS" | "ONE_HOUR";

const TIMER_OPTIONS: {
  value: TimerOption;
  label: string;
  duration: number;
  problems: string;
  tag: string;
}[] = [
  {
    value: "TEN_MINS",
    label: "10 Minutes",
    duration: 10,
    problems: "1 Easy",
    tag: "Sprint",
  },
  {
    value: "THIRTY_MINS",
    label: "30 Minutes",
    duration: 30,
    problems: "1 Easy + 1 Medium",
    tag: "Standard",
  },
  {
    value: "ONE_HOUR",
    label: "1 Hour",
    duration: 60,
    problems: "1 Easy + 1 Medium + 1 Hard",
    tag: "Marathon",
  },
];

/* ─────────────────────────────────────────────
   Stat card
───────────────────────────────────────────── */
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
      <span className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        {label}
      </span>
      <span className={`text-2xl font-light tracking-tight ${color}`}>
        {value}
      </span>
    </div>
  );
}

export default function DuelQueue() {
  const router = useRouter();
  const { user } = useAuthStore();
  const socket = useSocket();

  const [selectedTimer, setSelectedTimer] = useState<TimerOption | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string>("");
  const [queueStatus, setQueueStatus] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        try {
          const activeDuelRes = await api.get("/duels/active/current");
          if (activeDuelRes.data?.id) {
            router.push(`/duels/${activeDuelRes.data.id}`);
            return;
          }
        } catch {
          // 404 = no active duel, expected
        }
        const [statusRes, statsRes] = await Promise.all([
          api.get("/duels/queue/status"),
          api.get("/duels/stats/my-stats"),
        ]);
        setQueueStatus(statusRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinQueue = async (timerOption: TimerOption) => {
    setSelectedTimer(timerOption);
    setIsSearching(true);
    setError("");
    try {
      const res = await api.post("/duels/queue/join", { timerOption });
      if (res.data.matched) router.push(`/duels/${res.data.duelId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to join queue");
      setIsSearching(false);
      setSelectedTimer(null);
    }
  };

  const handleCancelSearch = async () => {
    try {
      await api.post("/duels/queue/leave");
      setIsSearching(false);
      setSelectedTimer(null);
    } catch (err) {
      console.error("Error leaving queue:", err);
    }
  };

  /* ── Searching state ── */
  if (isSearching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0e0e] px-4">
        {/* Grain */}
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px",
          }}
        />
        <div className="relative z-10 w-full max-w-sm py-4">
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm px-8 py-10 text-center">
            {/* Spinner ring */}
            <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.07]">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
            </div>

            <h2 className="mb-1 text-xl font-light tracking-tight text-zinc-100">
              Finding{" "}
              <em
                className="not-italic text-zinc-400"
                style={{ fontFamily: "Georgia, serif" }}
              >
                opponent
              </em>
              …
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-zinc-600">
              Searching for a match at your skill level.
            </p>

            {/* Rating range */}
            {stats && (
              <div className="mb-6 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 font-mono text-xs text-zinc-500">
                Rating range: {stats.rating - 100} – {stats.rating + 100}
              </div>
            )}

            <button
              onClick={handleCancelSearch}
              className="w-full rounded-xl border border-white/[0.10] bg-transparent px-4 py-2.5 text-xs font-semibold text-zinc-500 transition-all hover:border-white/20 hover:text-zinc-300"
            >
              Cancel Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main queue page ── */
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
            <span className="h-px w-5 bg-zinc-700" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              1v1 Code Duel
            </span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-zinc-100">
            Challenge a{" "}
            <em
              className="not-italic text-zinc-400"
              style={{ fontFamily: "Georgia, serif" }}
            >
              rival
            </em>
            .
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Race to solve problems at your skill level. First to pass all test
            cases wins.
          </p>
        </div>

        {/* ── USER STATS ── */}
        {stats && (
          <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Rating"
              value={stats.rating}
              color="text-violet-400"
            />
            <StatCard
              label="Total Duels"
              value={stats.totalDuels}
              color="text-sky-400"
            />
            <StatCard
              label="Wins"
              value={stats.wins}
              color="text-emerald-400"
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate || 0}%`}
              color="text-amber-400"
            />
          </div>
        )}

        {/* ── ERROR ── */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-2.5 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* ── MODE SELECTION ── */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-px w-4 bg-zinc-800" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              Select Mode
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {TIMER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleJoinQueue(option.value)}
                className="group flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-left transition-all hover:border-white/[0.14] hover:bg-white/[0.05]"
              >
                {/* Top row: tag + waiting count */}
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {option.tag}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-700">
                    <span className="h-1 w-1 rounded-full bg-zinc-700" />
                    {queueStatus[option.value] || 0} waiting
                  </span>
                </div>

                {/* Duration */}
                <h3 className="mb-1 text-lg font-light tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                  {option.label}
                </h3>

                {/* Problems */}
                <p className="mb-4 text-xs text-zinc-500 leading-relaxed">
                  {option.problems}
                </p>

                {/* CTA */}
                <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-zinc-600 group-hover:text-zinc-400 transition-colors">
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
                      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                    />
                  </svg>
                  Join queue
                </div>

                {/* Bottom accent */}
                <div className="mt-5 h-px w-full bg-gradient-to-r from-white/[0.04] to-transparent" />
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.05] mb-8" />

        {/* ── QUICK LINKS ── */}
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/duels/leaderboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-100 bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
              />
            </svg>
            Leaderboard
          </Link>
          <Link
            href="/duels/history"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.10] bg-transparent px-5 py-2.5 text-sm font-semibold text-zinc-400 transition-all hover:border-white/20 hover:bg-white/[0.05] hover:text-zinc-200"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
            My History
          </Link>
        </div>
      </div>
    </div>
  );
}
