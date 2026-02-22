"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import type { ProblemListItem } from "@/lib/types";

export default function HostContestPage() {
  const router = useRouter();
  const { user, hydrate, loading: authLoading } = useAuthStore();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function fetchProblems() {
      try {
        const { data } = await api.get("/problems", { params: { limit: 50 } });
        setProblems(data.problems);
      } catch {
        console.error("Failed to fetch problems");
      } finally {
        setLoading(false);
      }
    }
    fetchProblems();
  }, []);

  const filtered = problems.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleProblem(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  }

  async function handleCreate() {
    if (!title.trim()) {
      setError("Please enter a contest title");
      return;
    }
    if (selectedIds.length === 0) {
      setError("Select at least 1 problem");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const { data } = await api.post("/rooms", {
        title,
        problemIds: selectedIds,
        duration,
      });
      router.push(`/rooms/${data.room.roomCode}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create room");
    } finally {
      setCreating(false);
    }
  }

  const diffConfig: Record<string, { label: string; cls: string }> = {
    EASY: {
      label: "Easy",
      cls: "bg-emerald-900/50 text-emerald-400 border border-emerald-800/60",
    },
    MEDIUM: {
      label: "Medium",
      cls: "bg-amber-900/50   text-amber-400   border border-amber-800/60",
    },
    HARD: {
      label: "Hard",
      cls: "bg-red-900/50     text-red-400     border border-red-800/60",
    },
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

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

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-12">
        {/* Page header */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-5 bg-zinc-700" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              New room
            </span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-zinc-100">
            Host a{" "}
            <em
              className="not-italic text-zinc-400"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              contest
            </em>
            .
          </h1>
          <p className="mt-3 text-sm text-zinc-500 leading-relaxed max-w-lg">
            Create a private room and share the code with friends. Select up to{" "}
            <span className="text-zinc-300 font-medium">6 problems</span> from
            the existing problem set.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/50 px-4 py-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Settings card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm p-6 mb-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-px w-5 bg-zinc-700" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              Settings
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-600">
                Contest Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Friday Night Coding"
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 transition-colors focus:border-white/[0.18] focus:bg-white/[0.05] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-600">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) =>
                  setDuration(Math.max(10, Math.min(300, +e.target.value)))
                }
                min={10}
                max={300}
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 transition-colors focus:border-white/[0.18] focus:bg-white/[0.05] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Problem picker card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm p-6 mb-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-px w-5 bg-zinc-700" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Problems
              </span>
            </div>
            <span className="font-mono text-[10px] text-zinc-600">
              {selectedIds.length} / 6 selected
            </span>
          </div>

          {/* Selected chips */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/[0.05]">
              {selectedIds.map((id, idx) => {
                const prob = problems.find((p) => p.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.05] px-3 py-1 text-xs text-zinc-300"
                  >
                    <span className="font-mono text-zinc-500 text-[10px]">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {prob?.title}
                    <button
                      onClick={() => toggleProblem(id)}
                      className="text-zinc-600 hover:text-zinc-200 transition-colors ml-1 leading-none"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Search */}
          <div className="mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems…"
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 transition-colors focus:border-white/[0.18] focus:bg-white/[0.05] focus:outline-none"
            />
          </div>

          {/* Problem list table */}
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
              <span className="font-mono text-xs text-zinc-700">
                Loading problems…
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.07] overflow-hidden max-h-80 overflow-y-auto">
              {/* Table header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  Problem
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  Difficulty
                </span>
              </div>

              {filtered.length === 0 ? (
                <p className="font-mono text-xs text-zinc-700 text-center py-8">
                  No problems found
                </p>
              ) : (
                filtered.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const disabled = !isSelected && selectedIds.length >= 6;
                  const diff = diffConfig[p.difficulty] ?? {
                    label: p.difficulty,
                    cls: "bg-zinc-800 text-zinc-400 border border-zinc-700",
                  };
                  return (
                    <button
                      key={p.id}
                      onClick={() => !disabled && toggleProblem(p.id)}
                      disabled={disabled}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-white/[0.04] transition-all duration-200 last:border-0 ${
                        isSelected
                          ? "bg-white/[0.06] border-l-2 border-l-zinc-400"
                          : disabled
                            ? "opacity-30 cursor-not-allowed"
                            : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <div
                          className={`h-4 w-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? "border-zinc-300 bg-zinc-100"
                              : "border-white/[0.15] bg-transparent"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="h-2.5 w-2.5 text-zinc-900"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-sm transition-colors ${isSelected ? "text-zinc-100" : "text-zinc-400"}`}
                        >
                          {p.title}
                        </span>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${diff.cls}`}
                      >
                        {diff.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.05] mb-5" />

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={creating || selectedIds.length === 0 || !title.trim()}
          className="w-full rounded-xl border border-zinc-100 bg-zinc-100 py-3 text-sm font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? (
            <span className="inline-flex items-center justify-center gap-2">
              <svg
                className="h-3.5 w-3.5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                />
              </svg>
              Creating Room…
            </span>
          ) : (
            "Create Contest Room →"
          )}
        </button>
      </div>
    </div>
  );
}
