"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function DuelHistory() {
  const [duels, setDuels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/duels/history", { params: { page, limit: 20 } });
        setDuels(res.data.duels);
        setPagination(res.data.pagination);
      } catch (err) {
        console.error("Error fetching duel history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [page]);

  const getVerdictColor = (verdict: string) => {
    if (verdict === "ACCEPTED") return "text-green-400";
    if (verdict === "PENDING" || verdict === "RUNNING") return "text-yellow-400";
    return "text-red-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <p className="text-zinc-500">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">📊 Duel History</h1>
          <p className="text-zinc-400 text-sm">Your past matches</p>
        </div>
        <Link href="/duels" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Back to Duels
        </Link>
      </div>

      {/* History List */}
      {duels.length > 0 ? (
        <div className="space-y-3 mb-8">
          {duels.map((duel) => {
            const currentUserParticipant = duel.participants[0]; // Assuming first is current user for demo
            const isWinner = currentUserParticipant?.isWinner === true;
            const isDraw = !duel.participants.some((p: any) => p.isWinner === true);

            return (
              <div
                key={duel.id}
                className="border border-zinc-800 rounded p-4 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  {/* Problem Info */}
                  <div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {(duel.problems || []).map((prob: any) => (
                        <span
                          key={prob.id}
                          className={`px-2 py-0.5 rounded text-xs font-medium ${prob.difficulty === "EASY"
                              ? "bg-green-900/40 text-green-400"
                              : prob.difficulty === "MEDIUM"
                                ? "bg-yellow-900/40 text-yellow-400"
                                : "bg-red-900/40 text-red-400"
                            }`}
                        >
                          {prob.label}: {prob.difficulty}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {duel.startedAt ? new Date(duel.startedAt).toLocaleDateString() : "—"}
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="text-xs space-y-1">
                    {duel.participants.map((p: any) => {
                      const solved = p.submissions?.filter((s: any) => s.solved).length || 0;
                      const total = (duel.problems || []).length;
                      return (
                        <div key={p.userId} className="flex justify-between items-center">
                          <span className="text-zinc-300">{p.username}</span>
                          <span className={`font-mono font-medium ${solved === total && total > 0 ? "text-green-400" : "text-zinc-400"}`}>
                            {solved}/{total}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Timer */}
                  <div className="text-xs text-zinc-400 text-right">
                    {duel.timerOption === "TEN_MINS" ? "10 min" : duel.timerOption === "THIRTY_MINS" ? "30 min" : "1 hour"}
                  </div>

                  {/* Result */}
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isWinner && (
                        <>
                          <span className="text-lg">🏆</span>
                          <span className="text-sm font-semibold text-green-400">Victory</span>
                        </>
                      )}
                      {isDraw && (
                        <>
                          <span className="text-lg">🤝</span>
                          <span className="text-sm font-semibold text-yellow-400">Draw</span>
                        </>
                      )}
                      {!isWinner && !isDraw && (
                        <>
                          <span className="text-lg">💔</span>
                          <span className="text-sm font-semibold text-red-400">Defeat</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg p-8 text-center bg-zinc-900/50">
          <p className="text-zinc-400 mb-4 text-sm">No duels yet. Start your first duel!</p>
          <Link
            href="/duels"
            className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Find an Opponent
          </Link>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-1">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
            const startPage = Math.max(1, page - 2);
            return startPage + i;
          }).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${page === p
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
            className="rounded border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
