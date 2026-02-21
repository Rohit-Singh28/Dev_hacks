"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <p className="text-zinc-500">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">🏆 Duel Leaderboard</h1>
          <p className="text-zinc-400 text-sm">Top competitive programmers ranked by rating</p>
        </div>
        <Link
          href="/duels"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← Back to Duels
        </Link>
      </div>

      {/* Leaderboard Table */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 text-zinc-400">
              <th className="text-left px-4 py-3 font-medium w-12">#</th>
              <th className="text-left px-4 py-3 font-medium">Player</th>
              <th className="text-right px-4 py-3 font-medium w-24">Rating</th>
              <th className="text-right px-4 py-3 font-medium w-20">Duels</th>
              <th className="text-right px-4 py-3 font-medium w-16">Wins</th>
              <th className="text-right px-4 py-3 font-medium w-16">Losses</th>
              <th className="text-right px-4 py-3 font-medium w-24">Win Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {leaderboard.map((player, idx) => (
              <tr
                key={player.id}
                className="hover:bg-zinc-900/50 transition-colors"
              >
                <td className="px-4 py-3 font-bold">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-white font-medium">{player.username}</p>
                    <p className="text-zinc-500 text-xs">
                      Joined {new Date(player.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-purple-400">
                  {player.rating}
                </td>
                <td className="px-4 py-3 text-right text-zinc-300">
                  {player.duelStats.totalDuels}
                </td>
                <td className="px-4 py-3 text-right text-green-400 font-medium">
                  {player.duelStats.wins}
                </td>
                <td className="px-4 py-3 text-right text-red-400 font-medium">
                  {player.duelStats.losses}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-12 bg-zinc-800 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${player.duelStats.winRate}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-medium text-xs">
                      {player.duelStats.winRate}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
