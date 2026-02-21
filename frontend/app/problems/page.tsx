"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { DIFFICULTY_COLORS } from "@/lib/constants";

interface Topic {
  id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  _count?: { problems: number };
}

interface ProblemListItem {
  id: string;
  title: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  timeLimit: number;
  memoryLimit: number;
  topic?: Topic;
  _count: { submissions: number };
}

export default function ProblemsPage() {
  const { user } = useAuthStore();
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [topicFilter, setTopicFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showBookmarked, setShowBookmarked] = useState(false);

  // Fetch topics
  useEffect(() => {
    async function fetchTopics() {
      try {
        const { data } = await api.get("/problems/topics/all");
        setTopics(data.topics);
      } catch (err) {
        console.error("Failed to fetch topics:", err);
      }
    }
    fetchTopics();
  }, []);

  // Fetch problems
  useEffect(() => {
    async function fetchProblems() {
      try {
        const params: any = {};
        if (filter !== "ALL") params.difficulty = filter;
        if (topicFilter !== "ALL") params.topic = topicFilter;
        if (search.trim()) params.search = search.trim();
        const { data } = await api.get("/problems", { params });
        setProblems(data.problems);
      } catch (err) {
        console.error("Failed to fetch problems:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProblems();
  }, [filter, topicFilter, search]);

  // Fetch solved & bookmarked IDs for logged-in user
  useEffect(() => {
    if (!user) {
      setSolvedIds(new Set());
      setBookmarkedIds(new Set());
      return;
    }
    async function fetchUserData() {
      try {
        const [solvedRes, bookmarkedRes] = await Promise.all([
          api.get("/users/solved"),
          api.get("/users/bookmarked-ids"),
        ]);
        setSolvedIds(new Set(solvedRes.data.solvedProblemIds));
        setBookmarkedIds(new Set(bookmarkedRes.data.bookmarkedProblemIds));
      } catch {
        // Silently ignore if not logged in
      }
    }
    fetchUserData();
  }, [user]);

  const toggleBookmark = async (problemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    try {
      const { data } = await api.post("/bookmarks/toggle", { problemId });
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (data.bookmarked) {
          next.add(problemId);
        } else {
          next.delete(problemId);
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    }
  };

  const filteredProblems = showBookmarked
    ? problems.filter((p) => bookmarkedIds.has(p.id))
    : problems;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Problems</h1>
        <div className="flex items-center gap-3">
          {/* Roadmap Button */}
          <Link
            href="/problems/roadmap"
            className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">Roadmap</span>
          </Link>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Difficulty Filter */}
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
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

        {/* Topic Filter */}
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-zinc-600 focus:outline-none"
        >
          <option value="ALL">All Topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.slug}>
              {t.name} ({t._count?.problems || 0})
            </option>
          ))}
        </select>

        {topicFilter !== "ALL" && (
          <button
            onClick={() => setTopicFilter("ALL")}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Search and Bookmark Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
          />
        </div>
        {user && (
          <button
            onClick={() => setShowBookmarked(!showBookmarked)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
              showBookmarked
                ? "border-yellow-600 bg-yellow-600/10 text-yellow-400"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill={showBookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            Bookmarks
          </button>
        )}
      </div>

      {/* Stats Bar */}
      {user && solvedIds.size > 0 && (
        <div className="flex items-center gap-4 mb-4 text-xs text-zinc-500">
          <span>
            Solved:{" "}
            <span className="text-green-400 font-medium">{solvedIds.size}</span>
          </span>
          <span>
            Bookmarked:{" "}
            <span className="text-yellow-400 font-medium">
              {bookmarkedIds.size}
            </span>
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-500" />
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400">
                <th className="text-left px-4 py-3 font-medium w-10">Status</th>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Topic</th>
                <th className="text-left px-4 py-3 font-medium">Difficulty</th>
                <th className="text-right px-4 py-3 font-medium">
                  Submissions
                </th>
                {user && (
                  <th className="text-center px-4 py-3 font-medium w-10">
                    <svg
                      className="h-4 w-4 mx-auto text-zinc-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredProblems.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="px-4 py-3 text-center">
                    {solvedIds.has(p.id) ? (
                      <svg
                        className="h-4 w-4 text-green-500 mx-auto"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="h-4 w-4 block mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/problems/${p.slug}`}
                      className="text-blue-400 hover:underline font-medium"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {p.topic ? (
                      <button
                        onClick={() => setTopicFilter(p.topic!.slug)}
                        className="px-2 py-0.5 text-xs rounded-full border transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: `${p.topic.color}15`,
                          borderColor: `${p.topic.color}40`,
                          color: p.topic.color,
                        }}
                      >
                        {p.topic.name}
                      </button>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
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
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {p._count.submissions}
                  </td>
                  {user && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => toggleBookmark(p.id, e)}
                        className="p-1 rounded hover:bg-zinc-800 transition-colors"
                        title={
                          bookmarkedIds.has(p.id)
                            ? "Remove bookmark"
                            : "Bookmark problem"
                        }
                      >
                        <svg
                          className={`h-4 w-4 ${
                            bookmarkedIds.has(p.id)
                              ? "text-yellow-400"
                              : "text-zinc-600 hover:text-zinc-400"
                          }`}
                          fill={
                            bookmarkedIds.has(p.id) ? "currentColor" : "none"
                          }
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                          />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredProblems.length === 0 && (
                <tr>
                  <td
                    colSpan={user ? 7 : 6}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    {showBookmarked
                      ? "No bookmarked problems yet."
                      : "No problems found."}
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
