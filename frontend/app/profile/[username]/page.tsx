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

  // Fetch streak data if viewing own profile
  useEffect(() => {
    if (!currentUser || currentUser.username !== username) return;
    async function fetchStreak() {
      try {
        const { data } = await api.get("/users/streak");
        setStreak(data);
      } catch {
        // Ignore
      }
    }
    fetchStreak();
  }, [currentUser, username]);

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
      {streak && streak.heatmap.length > 0 && (
        <div className="rounded-lg border border-zinc-800 p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-300">
              Activity Heatmap
            </h3>
            <span className="text-xs text-zinc-500">
              {streak.totalActiveDays} active days in the past year
            </span>
          </div>
          <ActivityHeatmap data={streak.heatmap} />
        </div>
      )}

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
  // Build a map of date -> count
  const dateMap = new Map<string, number>();
  data.forEach((d) => {
    const dateStr = new Date(d.date).toISOString().split("T")[0];
    dateMap.set(dateStr, d.count);
  });

  // Generate last 365 days
  const days: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({ date: dateStr, count: dateMap.get(dateStr) || 0 });
  }

  // Group into weeks (columns)
  const weeks: { date: string; count: number }[][] = [];
  let currentWeek: { date: string; count: number }[] = [];

  // Pad the first week to start on Sunday
  const firstDay = new Date(days[0].date).getDay();
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push({ date: "", count: -1 }); // placeholder
  }

  for (const day of days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const getColor = (count: number) => {
    if (count < 0) return "bg-transparent";
    if (count === 0) return "bg-zinc-800";
    if (count === 1) return "bg-green-900";
    if (count <= 3) return "bg-green-700";
    if (count <= 5) return "bg-green-500";
    return "bg-green-400";
  };

  const monthLabels = [
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

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.75">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.75">
            {week.map((day, di) => (
              <div
                key={`${wi}-${di}`}
                className={`h-3 w-3 rounded-sm ${getColor(day.count)}`}
                title={
                  day.date
                    ? `${day.date}: ${day.count} problem${day.count !== 1 ? "s" : ""} solved`
                    : ""
                }
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm bg-zinc-800" />
          <div className="h-3 w-3 rounded-sm bg-green-900" />
          <div className="h-3 w-3 rounded-sm bg-green-700" />
          <div className="h-3 w-3 rounded-sm bg-green-500" />
          <div className="h-3 w-3 rounded-sm bg-green-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
