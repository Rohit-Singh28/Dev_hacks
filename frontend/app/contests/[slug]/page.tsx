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

export default function ContestDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [contest, setContest] = useState<Contest | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // Join contest WebSocket room
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <p className="text-zinc-500">Loading contest...</p>
      </div>
    );
  }

  if (!contest) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{contest.title}</h1>
          {contest.description && (
            <p className="text-zinc-400 text-sm">{contest.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <ContestTimer
            startTime={contest.startTime}
            endTime={contest.endTime}
            status={contest.status}
          />
          {!isRegistered && contest.status !== "ENDED" && (
            <button
              onClick={handleRegister}
              disabled={registering}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {registering ? "Registering..." : "Register"}
            </button>
          )}
          {isRegistered && (
            <span className="text-sm text-green-400">✓ Registered</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mb-6">
        <Link
          href={`/contests/${slug}`}
          className="rounded bg-zinc-800 px-4 py-2 text-sm text-white"
        >
          Problems
        </Link>
        <Link
          href={`/contests/${slug}/scoreboard`}
          className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Scoreboard
        </Link>
      </div>

      {/* Problems Table */}
      {contest.contestProblems.length === 0 ? (
        <p className="text-zinc-500 text-sm">
          Problems will be revealed when the contest starts.
        </p>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400">
                <th className="text-left px-4 py-3 font-medium w-16">#</th>
                <th className="text-left px-4 py-3 font-medium">Problem</th>
                <th className="text-left px-4 py-3 font-medium">Difficulty</th>
                <th className="text-right px-4 py-3 font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {contest.contestProblems.map((cp) => (
                <tr
                  key={cp.id}
                  className="hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-bold text-zinc-300">
                    {cp.label}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/contests/${slug}/problems/${cp.label}`}
                      className="text-blue-400 hover:underline font-medium"
                    >
                      {cp.problem.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        DIFFICULTY_COLORS[
                          cp.problem.difficulty as keyof typeof DIFFICULTY_COLORS
                        ]
                      }`}
                    >
                      {cp.problem.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {cp.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
