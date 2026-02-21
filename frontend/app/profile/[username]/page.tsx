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

  // Fetch streak data for the profile user
  useEffect(() => {
    async function fetchStreak() {
      try {
        const { data } = await api.get("/users/streak", {
          params: { username },
        });
        setStreak(data);
      } catch {
        // If no streak data, set defaults so heatmap still renders
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
      <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-500" />
      </div>
    );
  }

  if (error || !profile || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
        <p className="text-zinc-500">{error || "User not found"}</p>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === username;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-8">
        <div className="h-20 w-20 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
          {profile.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {profile.username}
            </h1>
            {isOwnProfile && (
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-zinc-400">
              Rating:{" "}
              <span className="text-blue-400 font-medium">
                {profile.rating}
              </span>
            </span>
            <span className="text-sm text-zinc-500">
              Joined {new Date(profile.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Streak & Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Problems Solved"
          value={stats.totalSolved}
          icon={
            <svg
              className="h-5 w-5 text-green-500"
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
          suffix=" days"
          icon={
            <svg
              className="h-5 w-5 text-orange-500"
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
          suffix=" days"
          icon={
            <svg
              className="h-5 w-5 text-yellow-500"
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
              className="h-5 w-5 text-purple-500"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Difficulty Breakdown */}
        <div className="col-span-1 rounded-lg border border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">
            Problems by Difficulty
          </h3>
          <div className="space-y-3">
            <DifficultyBar
              label="Easy"
              count={stats.difficultyCounts.EASY}
              total={stats.totalSolved}
              color="bg-green-500"
              textColor="text-green-500"
            />
            <DifficultyBar
              label="Medium"
              count={stats.difficultyCounts.MEDIUM}
              total={stats.totalSolved}
              color="bg-yellow-500"
              textColor="text-yellow-500"
            />
            <DifficultyBar
              label="Hard"
              count={stats.difficultyCounts.HARD}
              total={stats.totalSolved}
              color="bg-red-500"
              textColor="text-red-500"
            />
          </div>
        </div>

        {/* Submission Stats */}
        <div className="col-span-1 rounded-lg border border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">
            Submissions
          </h3>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center h-24 w-24 rounded-full border-4 border-green-500/30 relative">
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats.acceptanceRate}%
                </p>
                <p className="text-xs text-zinc-500">Acceptance</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="bg-zinc-900 rounded p-2">
              <p className="text-white font-medium">{stats.totalSubmissions}</p>
              <p className="text-zinc-500 text-xs">Total</p>
            </div>
            <div className="bg-zinc-900 rounded p-2">
              <p className="text-green-400 font-medium">
                {stats.acceptedSubmissions}
              </p>
              <p className="text-zinc-500 text-xs">Accepted</p>
            </div>
          </div>
        </div>

        {/* Language Stats */}
        <div className="col-span-1 rounded-lg border border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">
            Languages Used
          </h3>
          {stats.languageStats.length === 0 ? (
            <p className="text-sm text-zinc-500">No submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.languageStats.map((ls) => {
                const total = stats.languageStats.reduce(
                  (sum, l) => sum + l.count,
                  0,
                );
                const pct =
                  total > 0 ? Math.round((ls.count / total) * 100) : 0;
                return (
                  <div key={ls.language}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300">
                        {ls.language === "CPP"
                          ? "C++"
                          : ls.language === "PYTHON"
                            ? "Python"
                            : ls.language}
                      </span>
                      <span className="text-zinc-500">
                        {ls.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
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

      {/* Activity Heatmap */}
      <div className="rounded-lg border border-zinc-800 p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <svg
              className="h-4 w-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            {streak?.totalActiveDays ?? 0} submissions in the last year
          </h3>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>
              Total active days:{" "}
              <span className="text-zinc-300 font-medium">
                {streak?.totalActiveDays ?? 0}
              </span>
            </span>
            <span>
              Max streak:{" "}
              <span className="text-orange-400 font-medium">
                {streak?.longestStreak ?? 0}
              </span>
            </span>
          </div>
        </div>
        <ActivityHeatmap data={streak?.heatmap ?? []} />
      </div>

      {/* Recent Submissions */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 bg-zinc-900 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300">
            Recent Submissions
          </h3>
        </div>
        {recentSubmissions.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500">No submissions yet.</p>
        ) : (
          <div className="divide-y divide-zinc-800">
            {recentSubmissions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${
                      VERDICT_COLORS[s.verdict]
                    }`}
                  >
                    {VERDICT_LABELS[s.verdict]}
                  </span>
                  <Link
                    href={`/problems/${s.problem.slug}`}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    {s.problem.title}
                  </Link>
                  <span
                    className={`text-xs ${
                      DIFFICULTY_COLORS[
                        s.problem.difficulty as keyof typeof DIFFICULTY_COLORS
                      ] || "text-zinc-500"
                    }`}
                  >
                    {s.problem.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{s.language}</span>
                  <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────────

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
    <div className="rounded-lg border border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-white">
        {value}
        {suffix && <span className="text-sm text-zinc-500">{suffix}</span>}
      </p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function DifficultyBar({
  label,
  count,
  total,
  color,
  textColor,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  textColor: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className={textColor}>{label}</span>
        <span className="text-zinc-400">{count}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ActivityHeatmap({
  data,
}: {
  data: { date: string; count: number; submissions: number }[];
}) {
  // Build a map of date string -> count
  const dateMap = new Map<string, { count: number; submissions: number }>();
  data.forEach((d) => {
    const dateStr = new Date(d.date).toISOString().split("T")[0];
    dateMap.set(dateStr, { count: d.count, submissions: d.submissions });
  });

  // Generate last 365 days
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

  // Group into weeks (columns of 7 rows). Each column = 1 week, row 0=Sun, row 6=Sat
  const weeks: ((typeof allDays)[number] | null)[][] = [];
  let currentWeek: ((typeof allDays)[number] | null)[] = [];

  // Pad the first week so it starts on Sunday (day 0)
  const firstDayOfWeek = allDays[0].date.getDay(); // 0=Sun
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }

  for (const day of allDays) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    // Pad the last week
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  // Calculate month label positions
  const monthLabels: { label: string; colIndex: number }[] = [];
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
  let lastMonth = -1;

  for (let wi = 0; wi < weeks.length; wi++) {
    // Find the first real day in this week
    const firstDay = weeks[wi].find((d) => d !== null);
    if (firstDay) {
      const month = firstDay.date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: monthNames[month], colIndex: wi });
        lastMonth = month;
      }
    }
  }

  const CELL_SIZE = 14; // px
  const CELL_GAP = 3; // px
  const COL_WIDTH = CELL_SIZE + CELL_GAP;
  const DAY_LABEL_WIDTH = 32;
  const MONTH_LABEL_HEIGHT = 20;

  const totalWidth = DAY_LABEL_WIDTH + weeks.length * COL_WIDTH;
  const totalHeight = MONTH_LABEL_HEIGHT + 7 * (CELL_SIZE + CELL_GAP);

  const getColor = (count: number): string => {
    if (count === 0) return "#27272a"; // zinc-800
    if (count === 1) return "#14532d"; // green-900
    if (count === 2) return "#166534"; // green-800
    if (count <= 4) return "#15803d"; // green-700
    if (count <= 6) return "#22c55e"; // green-500
    return "#4ade80"; // green-400
  };

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="overflow-x-auto pb-2">
      <svg width={totalWidth} height={totalHeight + 8} className="block">
        {/* Month labels */}
        {monthLabels.map((ml, i) => (
          <text
            key={i}
            x={DAY_LABEL_WIDTH + ml.colIndex * COL_WIDTH}
            y={MONTH_LABEL_HEIGHT - 4}
            className="fill-zinc-500"
            fontSize={11}
            fontFamily="system-ui, sans-serif"
          >
            {ml.label}
          </text>
        ))}

        {/* Day-of-week labels */}
        {dayLabels.map((label, di) =>
          label ? (
            <text
              key={di}
              x={0}
              y={
                MONTH_LABEL_HEIGHT + di * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2
              }
              className="fill-zinc-500"
              fontSize={10}
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          ) : null,
        )}

        {/* Heatmap cells */}
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
                rx={3}
                ry={3}
                fill={getColor(day.count)}
                className="transition-colors hover:stroke-zinc-400 hover:stroke-1"
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
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-zinc-500">
          Learn how we count contributions
        </span>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span>Less</span>
          {[
            "#27272a",
            "#14532d",
            "#166534",
            "#15803d",
            "#22c55e",
            "#4ade80",
          ].map((color, i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
