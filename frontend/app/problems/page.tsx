"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DIFFICULTY_COLORS } from "@/lib/constants";

interface ProblemListItem {
  id: string;
  title: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  timeLimit: number;
  memoryLimit: number;
  _count: { submissions: number };
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    async function fetch() {
      try {
        const params: any = {};
        if (filter !== "ALL") params.difficulty = filter;
        const { data } = await api.get("/problems", { params });
        setProblems(data.problems);
      } catch (err) {
        console.error("Failed to fetch problems:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [filter]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Problems</h1>
        <div className="flex gap-2">
          {["ALL", "EASY", "MEDIUM", "HARD"].map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                filter === d
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {d === "ALL" ? "All" : d.charAt(0) + d.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading problems...</p>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400">
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Difficulty</th>
                <th className="text-left px-4 py-3 font-medium">Time Limit</th>
                <th className="text-right px-4 py-3 font-medium">
                  Submissions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {problems.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/problems/${p.slug}`}
                      className="text-blue-400 hover:underline font-medium"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        DIFFICULTY_COLORS[p.difficulty]
                      }`}
                    >
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{p.timeLimit}ms</td>
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {p._count.submissions}
                  </td>
                </tr>
              ))}
              {problems.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No problems found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
