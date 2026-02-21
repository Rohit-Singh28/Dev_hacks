"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import {
  DIFFICULTY_COLORS,
  VERDICT_COLORS,
  VERDICT_LABELS,
} from "@/lib/constants";
import type {
  UserProfile,
  UserStats,
  StreakData,
  RecentSubmission,
} from "@/lib/types";

/* ─────────────────────────────────────────────
   Stat card
───────────────────────────────────────────── */
function StatCard({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
      <div className="mb-3">{icon}</div>
      <p className="text-2xl font-light tracking-tight text-zinc-100">
        {value}
        {suffix && <span className="ml-1 text-sm text-zinc-600">{suffix}</span>}
      </p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        {label}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Difficulty bar
───────────────────────────────────────────── */
function DifficultyBar({
  label,
  count,
  total,
  barColor,
  textColor,
}: {
  label: string;
  count: number;
  total: number;
  barColor: string;
  textColor: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`text-xs font-medium ${textColor}`}>{label}</span>
        <span className="font-mono text-xs text-zinc-600">{count}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Activity heatmap (logic unchanged)
───────────────────────────────────────────── */
function ActivityHeatmap({
  data,
}: {
  data: { date: string; count: number; submissions: number }[];
}) {
  const dateMap = new Map<string, { count: number; submissions: number }>();
  data.forEach((d) => {
    const dateStr = new Date(d.date).toISOString().split("T")[0];
    dateMap.set(dateStr, { count: d.count, submissions: d.submissions });
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allDays: {
    date: Date;
    dateStr: string;
    count: number;
    submissions: number;
  }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const entry = dateMap.get(dateStr);
    allDays.push({
      date: d,
      dateStr,
      count: entry?.count ?? 0,
      submissions: entry?.submissions ?? 0,
    });
  }

  const weeks: ((typeof allDays)[number] | null)[][] = [];
  let currentWeek: ((typeof allDays)[number] | null)[] = [];
  const firstDayOfWeek = allDays[0].date.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) currentWeek.push(null);
  for (const day of allDays) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthLabels: { label: string; colIndex: number }[] = [];
  let lastMonth = -1;
  for (let wi = 0; wi < weeks.length; wi++) {
    const firstDay = weeks[wi].find((d) => d !== null);
    if (firstDay) {
      const month = firstDay.date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: monthNames[month], colIndex: wi });
        lastMonth = month;
      }
    }
  }

  const CELL_SIZE = 13;
  const CELL_GAP = 3;
  const COL_WIDTH = CELL_SIZE + CELL_GAP;
  const DAY_LABEL_WIDTH = 30;
  const MONTH_LABEL_HEIGHT = 20;
  const totalWidth = DAY_LABEL_WIDTH + weeks.length * COL_WIDTH;
  const totalHeight = MONTH_LABEL_HEIGHT + 7 * (CELL_SIZE + CELL_GAP);

  // Themed: zinc-800 empty, emerald shades for activity
  const getColor = (count: number): string => {
    if (count === 0) return "rgba(255,255,255,0.04)";
    if (count === 1) return "#14532d";
    if (count === 2) return "#166534";
    if (count <= 4) return "#15803d";
    if (count <= 6) return "#22c55e";
    return "#4ade80";
  };

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="overflow-x-auto pb-2">
      <svg width={totalWidth} height={totalHeight + 8} className="block">
        {monthLabels.map((ml, i) => (
          <text
            key={i}
            x={DAY_LABEL_WIDTH + ml.colIndex * COL_WIDTH}
            y={MONTH_LABEL_HEIGHT - 5}
            fill="#52525b"
            fontSize={10}
            fontFamily="monospace"
          >
            {ml.label}
          </text>
        ))}
        {dayLabels.map((label, di) =>
          label ? (
            <text
              key={di}
              x={0}
              y={
                MONTH_LABEL_HEIGHT + di * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2
              }
              fill="#52525b"
              fontSize={9}
              fontFamily="monospace"
            >
              {label}
            </text>
          ) : null,
        )}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (!day) return null;
            return (
              <rect
                key={`${wi}-${di}`}
                x={DAY_LABEL_WIDTH + wi * COL_WIDTH}
                y={MONTH_LABEL_HEIGHT + di * (CELL_SIZE + CELL_GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                ry={2}
                fill={getColor(day.count)}
              >
                <title>
                  {day.dateStr}: {day.count} solved, {day.submissions}{" "}
                  submissions
                </title>
              </rect>
            );
          }),
        )}
      </svg>
      {/* Legend */}
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <span className="font-mono text-[10px] text-zinc-700">Less</span>
        {[
          "rgba(255,255,255,0.04)",
          "#14532d",
          "#166534",
          "#15803d",
          "#22c55e",
          "#4ade80",
        ].map((color, i) => (
          <div
            key={i}
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="font-mono text-[10px] text-zinc-700">More</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuthStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<
    RecentSubmission[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data } = await api.get(`/users/profile/${username}`);
        setProfile(data.user);
        setStats(data.stats);
        setRecentSubmissions(data.recentSubmissions);
      } catch {
        setError("User not found");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [username]);

  useEffect(() => {
    async function fetchStreak() {
      try {
        const { data } = await api.get("/users/streak", {
          params: { username },
        });
        setStreak(data);
      } catch {
        setStreak({
          currentStreak: 0,
          longestStreak: 0,
          totalActiveDays: 0,
          heatmap: [],
        });
      }
    }
    fetchStreak();
  }, [username]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center bg-[#0e0e0e]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  if (error || !profile || !stats) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center bg-[#0e0e0e]">
        <p className="font-mono text-xs text-zinc-700">
          {error || "User not found"}
        </p>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === username;
  const totalLangs = stats.languageStats.reduce((s, l) => s + l.count, 0);

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
        {/* ── PROFILE HEADER ── */}
        <div className="mb-10 flex items-start gap-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-600/60 to-sky-600/60 text-2xl font-bold text-white">
            {profile.username.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-light tracking-tight text-zinc-100">
                {profile.username}
              </h1>
              {isOwnProfile && (
                <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  You
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-mono text-xs text-zinc-600">
                Rating{" "}
                <span className="text-violet-400 font-semibold">
                  {profile.rating}
                </span>
              </span>
              <span className="h-3 w-px bg-white/[0.08]" />
              <span className="font-mono text-xs text-zinc-700">
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.05] mb-10" />

        {/* ── QUICK STATS ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Problems Solved"
            value={stats.totalSolved}
            icon={
              <svg
                className="h-4 w-4 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            label="Current Streak"
            value={streak?.currentStreak ?? 0}
            suffix="days"
            icon={
              <svg
                className="h-4 w-4 text-orange-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  clipRule="evenodd"
                />
              </svg>
            }
          />
          <StatCard
            label="Longest Streak"
            value={streak?.longestStreak ?? 0}
            suffix="days"
            icon={
              <svg
                className="h-4 w-4 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            }
          />
          <StatCard
            label="Contests Joined"
            value={stats.contestsParticipated}
            icon={
              <svg
                className="h-4 w-4 text-violet-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            }
          />
        </div>

        {/* ── DETAIL CARDS ROW ── */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Difficulty breakdown */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-px w-4 bg-zinc-800" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                By Difficulty
              </span>
            </div>
            <div className="space-y-4">
              <DifficultyBar
                label="Easy"
                count={stats.difficultyCounts.EASY}
                total={stats.totalSolved}
                barColor="bg-emerald-500"
                textColor="text-emerald-400"
              />
              <DifficultyBar
                label="Medium"
                count={stats.difficultyCounts.MEDIUM}
                total={stats.totalSolved}
                barColor="bg-amber-500"
                textColor="text-amber-400"
              />
              <DifficultyBar
                label="Hard"
                count={stats.difficultyCounts.HARD}
                total={stats.totalSolved}
                barColor="bg-red-500"
                textColor="text-red-400"
              />
            </div>
          </div>

          {/* Submission stats */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-px w-4 bg-zinc-800" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                Submissions
              </span>
            </div>
            {/* Acceptance ring */}
            <div className="mb-5 flex justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-900/40">
                <div className="text-center">
                  <p className="text-xl font-light text-zinc-100">
                    {stats.acceptanceRate}%
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-700">
                    Accept
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                <p className="font-mono text-base font-semibold text-zinc-200">
                  {stats.totalSubmissions}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-700">
                  Total
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                <p className="font-mono text-base font-semibold text-emerald-400">
                  {stats.acceptedSubmissions}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-700">
                  Accepted
                </p>
              </div>
            </div>
          </div>

          {/* Language stats */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-px w-4 bg-zinc-800" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                Languages
              </span>
            </div>
            {stats.languageStats.length === 0 ? (
              <p className="font-mono text-xs text-zinc-700">
                No submissions yet.
              </p>
            ) : (
              <div className="space-y-4">
                {stats.languageStats.map((ls) => {
                  const pct =
                    totalLangs > 0
                      ? Math.round((ls.count / totalLangs) * 100)
                      : 0;
                  const label =
                    ls.language === "CPP"
                      ? "C++"
                      : ls.language === "PYTHON"
                        ? "Python"
                        : ls.language;
                  return (
                    <div key={ls.language}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">{label}</span>
                        <span className="font-mono text-[10px] text-zinc-600">
                          {ls.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-zinc-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── ACTIVITY HEATMAP ── */}
        <div className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-px w-4 bg-zinc-800" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                Activity — last 365 days
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] text-zinc-700">
              <span>
                Active days{" "}
                <span className="text-zinc-400 font-semibold">
                  {streak?.totalActiveDays ?? 0}
                </span>
              </span>
              <span className="h-3 w-px bg-white/[0.06]" />
              <span>
                Max streak{" "}
                <span className="text-orange-400 font-semibold">
                  {streak?.longestStreak ?? 0}
                </span>
              </span>
            </div>
          </div>
          <ActivityHeatmap data={streak?.heatmap ?? []} />
        </div>

        {/* ── RECENT SUBMISSIONS ── */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          {/* Header */}
          <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-3.5 flex items-center gap-2">
            <span className="h-px w-4 bg-zinc-800" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              Recent Submissions
            </span>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-mono text-xs text-zinc-700">
                No submissions yet.
              </p>
            </div>
          ) : (
            <div>
              {recentSubmissions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-b border-white/[0.04] px-6 py-3.5 last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`shrink-0 text-xs font-semibold ${VERDICT_COLORS[s.verdict]}`}
                    >
                      {VERDICT_LABELS[s.verdict]}
                    </span>
                    <Link
                      href={`/problems/${s.problem.slug}`}
                      className="truncate text-sm text-zinc-300 hover:text-white transition-colors"
                    >
                      {s.problem.title}
                    </Link>
                    <span
                      className={`shrink-0 text-xs ${DIFFICULTY_COLORS[s.problem.difficulty as keyof typeof DIFFICULTY_COLORS] || "text-zinc-600"}`}
                    >
                      {s.problem.difficulty}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 font-mono text-[10px] text-zinc-700">
                    <span>{s.language}</span>
                    <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
