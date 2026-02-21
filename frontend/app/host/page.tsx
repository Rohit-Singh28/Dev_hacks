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
        const { data } = await api.get("/problems", {
          params: { limit: 50 },
        });
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
      if (prev.length >= 4) return prev; // max 4
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

  const diffColors: Record<string, string> = {
    EASY: "text-green-400",
    MEDIUM: "text-yellow-400",
    HARD: "text-red-400",
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Host a Contest</h1>

      {/* Room Code Info */}
      <p className="text-zinc-400 text-sm mb-6">
        Create a contest room and share the room code with friends. They can
        join using the code. You can select up to{" "}
        <strong className="text-white">4 problems</strong> from the existing
        problem set.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Title & Duration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Contest Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Friday Night Coding"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
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
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Selected Problems */}
      {selectedIds.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-zinc-300 mb-2">
            Selected Problems ({selectedIds.length}/4)
          </h2>
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((id, idx) => {
              const prob = problems.find((p) => p.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-700 bg-blue-950 px-3 py-1 text-sm text-blue-300"
                >
                  <span className="font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {prob?.title}
                  <button
                    onClick={() => toggleProblem(id)}
                    className="ml-1 text-blue-500 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Problem Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search problems..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Problem List */}
      {loading ? (
        <p className="text-zinc-500">Loading problems...</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto mb-6 rounded-lg border border-zinc-800">
          {filtered.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            const disabled = !isSelected && selectedIds.length >= 4;
            return (
              <button
                key={p.id}
                onClick={() => !disabled && toggleProblem(p.id)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "bg-blue-950/50 border-l-2 border-blue-500"
                    : disabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-zinc-900/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${
                      isSelected
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-zinc-600"
                    }`}
                  >
                    {isSelected && "✓"}
                  </div>
                  <span className="text-white font-medium">{p.title}</span>
                </div>
                <span
                  className={`text-xs font-medium ${diffColors[p.difficulty]}`}
                >
                  {p.difficulty}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-zinc-500">
              No problems found
            </p>
          )}
        </div>
      )}

      {/* Create Button */}
      <button
        onClick={handleCreate}
        disabled={creating || selectedIds.length === 0 || !title.trim()}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {creating ? "Creating Room..." : "Create Contest Room"}
      </button>
    </div>
  );
}
