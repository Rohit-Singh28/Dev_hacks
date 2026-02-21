"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useContestRoom } from "@/lib/socket";
import type { ScoreboardRow } from "@/lib/types";

interface ScoreboardData {
  contestId: string;
  problems: { id: string; label: string; problemId: string; points: number }[];
  scoreboard: ScoreboardRow[];
}

export default function ScoreboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ScoreboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useContestRoom(data?.contestId ?? null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get(`/contests/${slug}/scoreboard`);
        setData(data);
      } catch (err) {
        console.error("Failed to fetch scoreboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-zinc-500">Loading scoreboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-zinc-500">Failed to load scoreboard.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Scoreboard</h1>
        <Link
          href={`/contests/${slug}`}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← Back to Contest
        </Link>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 text-zinc-400">
              <th className="text-left px-4 py-3 font-medium w-16">#</th>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-right px-4 py-3 font-medium">Score</th>
              <th className="text-right px-4 py-3 font-medium">Penalty</th>
              {data.problems.map((p) => (
                <th
                  key={p.id}
                  className="text-center px-4 py-3 font-medium w-20"
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
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
                  className="hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-zinc-300">
                    {row.rank}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">
                      {row.user.username}
                    </span>
                    <span className="text-zinc-500 text-xs ml-2">
                      ({row.user.rating})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {row.score}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {Math.floor(row.penalty / 60)}m
                  </td>
                  {row.solvedProblems.map((sp) => (
                    <td key={sp.label} className="text-center px-4 py-3">
                      {sp.solved ? (
                        <span className="text-green-500 font-bold">✓</span>
                      ) : (
                        <span className="text-zinc-700">—</span>
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
