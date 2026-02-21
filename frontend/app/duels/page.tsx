"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/authStore";

type TimerOption = "TEN_MINS" | "THIRTY_MINS" | "ONE_HOUR";

const TIMER_OPTIONS: { value: TimerOption; label: string; duration: number; problems: string }[] = [
  { value: "TEN_MINS", label: "10 Minutes", duration: 10, problems: "1 Easy" },
  { value: "THIRTY_MINS", label: "30 Minutes", duration: 30, problems: "1 Easy + 1 Medium" },
  { value: "ONE_HOUR", label: "1 Hour", duration: 60, problems: "1 Easy + 1 Medium + 1 Hard" },
];

export default function DuelQueue() {
  const router = useRouter();
  const { user } = useAuthStore();
  const socket = useSocket();

  const [selectedTimer, setSelectedTimer] = useState<TimerOption | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string>("");
  const [queueStatus, setQueueStatus] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<any>(null);

  // Fetch queue status and user stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user has an active duel and redirect if so
        try {
          const activeDuelRes = await api.get("/duels/active/current");
          if (activeDuelRes.data?.id) {
            router.push(`/duels/${activeDuelRes.data.id}`);
            return;
          }
        } catch {
          // 404 means no active duel, which is expected
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

      if (res.data.matched) {
        router.push(`/duels/${res.data.duelId}`);
      }
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

  if (isSearching) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <div className="max-w-md w-full px-6">
          <div className="rounded-lg p-8 text-center border border-zinc-800 bg-zinc-900">
            <div className="mb-6">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Finding Opponent</h2>
            <p className="text-zinc-400 mb-4">
              Searching for an opponent at
              <br />
              your skill level...
            </p>
            <div className="bg-zinc-800 rounded p-3 mb-6 text-sm text-zinc-300 font-mono border border-zinc-700">
              Rating Range: {stats ? `${stats.rating - 100} - ${stats.rating + 100}` : "Loading..."}
            </div>
            <button
              onClick={handleCancelSearch}
              className="w-full rounded border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">⚔️ 1v1 Code Duel</h1>
        <p className="text-zinc-400 text-sm">Challenge another coder at your skill level</p>
      </div>

      {/* User Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg p-4 border border-zinc-800 bg-zinc-900/50">
            <div className="text-zinc-400 text-sm mb-1">Rating</div>
            <div className="text-2xl font-bold text-purple-400">{stats.rating}</div>
          </div>
          <div className="rounded-lg p-4 border border-zinc-800 bg-zinc-900/50">
            <div className="text-zinc-400 text-sm mb-1">Total Duels</div>
            <div className="text-2xl font-bold text-blue-400">{stats.totalDuels}</div>
          </div>
          <div className="rounded-lg p-4 border border-zinc-800 bg-zinc-900/50">
            <div className="text-zinc-400 text-sm mb-1">Wins</div>
            <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
          </div>
          <div className="rounded-lg p-4 border border-zinc-800 bg-zinc-900/50">
            <div className="text-zinc-400 text-sm mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.winRate || 0}%</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 border border-red-800 bg-red-950/50 text-red-400 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Timer Selection */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Select Mode</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {TIMER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleJoinQueue(option.value)}
              className="rounded border border-zinc-800 p-6 text-center hover:border-blue-600 hover:bg-zinc-900/80 transition-all group"
            >
              <div className="text-4xl mb-3">⏱️</div>
              <h3 className="text-lg font-bold text-white mb-1">{option.label}</h3>
              <p className="text-xs text-purple-400 font-medium mb-2">
                {option.problems}
              </p>
              <p className="text-xs text-zinc-500 mb-3">
                First to solve all wins!
              </p>
              <div className="text-xs text-blue-400 font-medium">
                {queueStatus[option.value] || 0} waiting
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4">
        <a
          href="/duels/leaderboard"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors text-center"
        >
          🏆 Leaderboard
        </a>
        <a
          href="/duels/history"
          className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors text-center"
        >
          📊 History
        </a>
      </div>
    </div>
  );
}
