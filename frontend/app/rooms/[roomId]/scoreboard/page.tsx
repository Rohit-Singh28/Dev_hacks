"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import type { ScoreboardRow } from "@/lib/types";

interface RoomScoreboardData {
  roomId: string;
  problems: { id: string; label: string; problemId: string; points: number }[];
  scoreboard: ScoreboardRow[];
}

export default function RoomScoreboardPage() {
  const { roomId: roomCode } = useParams<{ roomId: string }>();
  const { hydrate } = useAuthStore();
  const [data, setData] = useState<RoomScoreboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function fetch() {
      try {
        const { data: res } = await api.get(
          `/rooms/${String(roomCode).toUpperCase()}/scoreboard`,
        );
        setData(res);
      } catch {
        console.error("Failed to load scoreboard");
      } finally {
        setLoading(false);
      }
    }
    fetch();
    // Poll every 10s
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [roomCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-500">
        Loading scoreboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 text-center text-zinc-500">
        No scoreboard data available.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Scoreboard</h1>
        <Link
          href={`/rooms/${roomCode}`}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← Back to Room
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-zinc-400 font-medium w-16">
                #
              </th>
              <th className="px-4 py-3 text-left text-zinc-400 font-medium">
                User
              </th>
              <th className="px-4 py-3 text-center text-zinc-400 font-medium w-20">
                Score
              </th>
              <th className="px-4 py-3 text-center text-zinc-400 font-medium w-20">
                Penalty
              </th>
              {data.problems.map((p) => (
                <th
                  key={p.id}
                  className="px-4 py-3 text-center text-zinc-400 font-medium w-16"
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.scoreboard.length === 0 ? (
              <tr>
                <td
                  colSpan={4 + data.problems.length}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No participants yet.
                </td>
              </tr>
            ) : (
              data.scoreboard.map((row) => (
                <tr
                  key={row.user.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/30"
                >
                  <td className="px-4 py-3 text-zinc-400 font-mono">
                    {row.rank}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {row.user.username}
                      </span>
                      <span className="text-xs text-zinc-500">
                        ({row.user.rating})
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-white font-semibold">
                    {row.score}
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-400">
                    {row.penalty}
                  </td>
                  {row.solvedProblems.map((sp) => (
                    <td key={sp.label} className="px-4 py-3 text-center">
                      {sp.solved ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-900/50 text-green-400 text-xs font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
