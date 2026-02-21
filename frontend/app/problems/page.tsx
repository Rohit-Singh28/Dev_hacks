"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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

/* ─────────────────────────────────────────────
   Difficulty badge
───────────────────────────────────────────── */
function DifficultyBadge({
  difficulty,
}: {
  difficulty: "EASY" | "MEDIUM" | "HARD";
}) {
  const map = {
    EASY: "bg-emerald-900/50 text-emerald-400 border border-emerald-800/60",
    MEDIUM: "bg-amber-900/50   text-amber-400   border border-amber-800/60",
    HARD: "bg-red-900/50     text-red-400     border border-red-800/60",
  };
  const label = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${map[difficulty]}`}
    >
      {label[difficulty]}
    </span>
  );
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
        // Silently ignore
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
        if (data.bookmarked) next.add(problemId);
        else next.delete(problemId);
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
    <div className="min-h-screen bg-[#0e0e0e] text-zinc-100 font-sans antialiased">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto max-w-5xl px-8 py-12 lg:px-16"
      >
        {/* ── PAGE HEADER ── */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-px w-5 bg-zinc-700" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Problem Set
              </span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-100">
              Problems.
            </h1>
          </div>

          {/* Roadmap button */}
          <Link
            href="/problems/roadmap"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.06]"
          >
            <svg
              className="w-4 h-4 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="hidden sm:inline">Roadmap</span>
          </Link>
        </div>
        {/* ── FILTERS ── */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Difficulty pill group */}
          <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
            {["ALL", "EASY", "MEDIUM", "HARD"].map((d) => (
              <button
                key={d}
                onClick={() => setFilter(d)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                  filter === d
                    ? "bg-white/[0.08] text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {d === "ALL" ? "All" : d.charAt(0) + d.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Topic select */}
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="rounded-xl border  border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 focus:border-white/[0.15] focus:outline-none transition-colors"
          >
            <option value="ALL" className="bg-[#0e0e0e]">
              All Topics
            </option>
            {topics.map((t) => (
              <option key={t.id} value={t.slug} className="bg-[#0e0e0e]">
                {t.name} ({t._count?.problems || 0})
              </option>
            ))}
          </select>

          {/* Clear topic */}
          {topicFilter !== "ALL" && (
            <button
              onClick={() => setTopicFilter("ALL")}
              className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear
            </button>
          )}
        </div>
        {/* ── SEARCH + BOOKMARK ──
        <div className="mb-5 flex items-center gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600"
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
              placeholder="Search problems…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/[0.15] focus:bg-white/[0.05] focus:outline-none transition-colors"
            />
          </div>

          {user && (
            <button
              onClick={() => setShowBookmarked(!showBookmarked)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                showBookmarked
                  ? "border-amber-700/60 bg-amber-900/20 text-amber-400"
                  : "border-white/[0.07] bg-white/[0.03] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
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
        </div> */}
        {/* ── STATS BAR ── */}
        {user && solvedIds.size > 0 && (
          <div className="mb-5 flex items-center gap-5 font-mono text-[11px] text-zinc-600">
            <span>
              Solved{" "}
              <span className="text-emerald-400 font-semibold">
                {solvedIds.size}
              </span>
            </span>
            <span className="h-3 w-px bg-zinc-800" />
            <span>
              Bookmarked{" "}
              <span className="text-amber-400 font-semibold">
                {bookmarkedIds.size}
              </span>
            </span>
          </div>
        )}
        {/* ── TABLE ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-4 py-3 text-left w-10">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Status
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Title
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Topic
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Difficulty
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Submissions
                    </span>
                  </th>
                  {user && (
                    <th className="px-4 py-3 text-center w-10">
                      <svg
                        className="h-3.5 w-3.5 mx-auto text-zinc-700"
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

              <tbody>
                {filteredProblems.map((p, idx) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.3 }}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      {solvedIds.has(p.id) ? (
                        <svg
                          className="h-4 w-4 text-emerald-500 mx-auto"
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
                        <span className="block h-4 w-4 mx-auto rounded-full border border-white/[0.08]" />
                      )}
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/problems/${p.slug}`}
                        className="font-medium text-zinc-200 hover:text-white transition-colors"
                      >
                        {p.title}
                      </Link>
                    </td>

                    {/* Topic */}
                    <td className="px-4 py-3.5">
                      {p.topic ? (
                        <button
                          onClick={() => setTopicFilter(p.topic!.slug)}
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-opacity hover:opacity-75"
                          style={{
                            backgroundColor: `${p.topic.color}15`,
                            borderColor: `${p.topic.color}35`,
                            color: p.topic.color,
                          }}
                        >
                          {p.topic.name}
                        </button>
                      ) : (
                        <span className="text-zinc-700 text-xs">—</span>
                      )}
                    </td>

                    {/* Difficulty */}
                    <td className="px-4 py-3.5">
                      <DifficultyBadge difficulty={p.difficulty} />
                    </td>

                    {/* Submissions */}
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-zinc-600">
                      {p._count.submissions.toLocaleString()}
                    </td>

                    {/* Bookmark */}
                    {user && (
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={(e) => toggleBookmark(p.id, e)}
                          title={
                            bookmarkedIds.has(p.id)
                              ? "Remove bookmark"
                              : "Bookmark problem"
                          }
                          className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
                        >
                          <svg
                            className={`h-3.5 w-3.5 transition-colors ${
                              bookmarkedIds.has(p.id)
                                ? "text-amber-400"
                                : "text-zinc-700 hover:text-zinc-400"
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
                  </motion.tr>
                ))}

                {filteredProblems.length === 0 && (
                  <tr>
                    <td
                      colSpan={user ? 6 : 5}
                      className="px-4 py-14 text-center font-mono text-xs text-zinc-700"
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
      </motion.div>
    </div>
  );
}
