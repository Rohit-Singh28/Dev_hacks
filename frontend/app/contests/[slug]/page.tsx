"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { useContestRoom } from "@/lib/socket";
import ContestTimer from "@/components/ContestTimer";
import type { Contest } from "@/lib/types";
import { DIFFICULTY_COLORS } from "@/lib/constants";

/* ─────────────────────────────────────────────
   Difficulty badge
───────────────────────────────────────────── */
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, string> = {
    EASY: "bg-emerald-900/50 text-emerald-400 border border-emerald-800/60",
    MEDIUM: "bg-amber-900/50   text-amber-400   border border-amber-800/60",
    HARD: "bg-red-900/50     text-red-400     border border-red-800/60",
  };
  const label: Record<string, string> = {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${map[difficulty] ?? map.HARD}`}
    >
      {label[difficulty] ?? difficulty}
    </span>
  );
}

export default function ContestDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [contest, setContest] = useState<Contest | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useContestRoom(contest?.id ?? null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get(`/contests/${slug}`);
        setContest(data.contest);
        setIsRegistered(data.isRegistered);
      } catch {
        router.push("/contests");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [slug, router]);

  const handleRegister = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setRegistering(true);
    try {
      await api.post(`/contests/${slug}/register`);
      setIsRegistered(true);
    } catch (err: any) {
      alert(err.response?.data?.error || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center bg-[#0e0e0e]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  if (!contest) return null;

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
          <div className="flex-1 min-w-0">
            {/* Section label */}
            <div className="mb-2 flex items-center gap-2">
              <Link
                href="/contests"
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
                Contests
              </Link>
            </div>

            <h1 className="text-3xl font-light tracking-tight text-zinc-100 mb-3">
              {contest.title}
            </h1>

            {contest.description && (
              <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
                {contest.description}
              </p>
            )}
          </div>

          {/* Timer + register */}
          <div className="flex shrink-0 flex-col items-end gap-3">
            <ContestTimer
              startTime={contest.startTime}
              endTime={contest.endTime}
              status={contest.status}
            />

            {!isRegistered && contest.status !== "ENDED" && (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {registering ? (
                  <>
                    <svg
                      className="h-3 w-3 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                      />
                    </svg>
                    Registering…
                  </>
                ) : (
                  "Register →"
                )}
              </button>
            )}

            {isRegistered && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/50 bg-emerald-900/30 px-3 py-1 font-mono text-[11px] text-emerald-400">
                <svg
                  className="h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Registered
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.05] mb-8" />

        {/* ── TAB NAV ── */}
        <div className="mb-8 flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 w-fit">
          <Link
            href={`/contests/${slug}`}
            className="rounded-lg px-4 py-1.5 text-xs font-medium bg-white/[0.08] text-zinc-100 transition-all"
          >
            Problems
          </Link>
          <Link
            href={`/contests/${slug}/scoreboard`}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-all"
          >
            Scoreboard
          </Link>
        </div>

        {/* ── PROBLEMS TABLE ── */}
        {contest.contestProblems.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02] py-16">
            <div className="text-center">
              <svg
                className="mx-auto mb-3 h-8 w-8 text-zinc-800"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <p className="font-mono text-xs text-zinc-700">
                Problems will be revealed when the contest starts.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-5 py-3 text-left w-16">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      #
                    </span>
                  </th>
                  <th className="px-5 py-3 text-left">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Problem
                    </span>
                  </th>
                  <th className="px-5 py-3 text-left">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Difficulty
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Points
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {contest.contestProblems.map((cp) => (
                  <tr
                    key={cp.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Label */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-sm font-bold text-zinc-400">
                        {cp.label}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/contests/${slug}/problems/${cp.label}`}
                        className="font-medium text-zinc-200 hover:text-white transition-colors"
                      >
                        {cp.problem.title}
                      </Link>
                    </td>

                    {/* Difficulty */}
                    <td className="px-5 py-3.5">
                      <DifficultyBadge difficulty={cp.problem.difficulty} />
                    </td>

                    {/* Points */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-mono text-xs text-zinc-500">
                        {cp.points} pts
                      </span>
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
