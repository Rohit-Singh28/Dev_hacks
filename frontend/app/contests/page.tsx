"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Contest } from "@/lib/types";

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    async function fetch() {
      try {
        const params: any = {};
        if (filter !== "ALL") params.status = filter;
        const { data } = await api.get("/contests", { params });
        setContests(data.contests);
      } catch (err) {
        console.error("Failed to fetch contests:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [filter]);

  const statusColors: Record<string, string> = {
    UPCOMING: "text-blue-400 bg-blue-950 border-blue-800",
    ACTIVE: "text-green-400 bg-green-950 border-green-800",
    ENDED: "text-zinc-400 bg-zinc-900 border-zinc-700",
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Contests</h1>
        <div className="flex gap-2">
          {["ALL", "UPCOMING", "ACTIVE", "ENDED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                filter === s
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading contests...</p>
      ) : contests.length === 0 ? (
        <p className="text-zinc-500">No contests found.</p>
      ) : (
        <div className="space-y-3">
          {contests.map((c) => (
            <Link
              key={c.id}
              href={`/contests/${c.slug}`}
              className="block rounded-lg border border-zinc-800 p-5 hover:bg-zinc-900/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-white">{c.title}</h2>
                <span
                  className={`text-xs font-medium rounded px-2 py-0.5 border ${
                    statusColors[c.status]
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-zinc-400">
                <span>
                  Start: {new Date(c.startTime).toLocaleString()}
                </span>
                <span>End: {new Date(c.endTime).toLocaleString()}</span>
                <span>
                  {c._count?.contestParticipants ?? 0} participants
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
