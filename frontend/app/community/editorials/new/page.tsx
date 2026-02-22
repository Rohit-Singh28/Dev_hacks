"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
}

export default function NewEditorialPage() {
  const router = useRouter();
  const { user, hydrate, loading: authLoading } = useAuthStore();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const { data } = await api.get("/problems?limit=100");
      setProblems(data.problems || []);
    } catch (err) {
      console.error("Failed to fetch problems:", err);
    }
  };

  const filteredProblems = problems.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem || !title.trim() || !content.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/community/editorials", {
        problemId: selectedProblem.id,
        title: title.trim(),
        content: content.trim(),
        language: language.trim() || undefined,
      });
      router.push(`/community/editorials/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create editorial");
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "text-emerald-400";
      case "MEDIUM":
        return "text-amber-400";
      case "HARD":
        return "text-red-400";
      default:
        return "text-zinc-400";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">Sign in required</h1>
          <p className="text-zinc-500 mb-6">You need to be logged in to write an editorial.</p>
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-zinc-100">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/community"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Community
        </Link>

        <h1 className="mb-8 text-2xl font-bold text-white">Write an Editorial</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Problem Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Select Problem <span className="text-red-400">*</span>
            </label>
            {selectedProblem ? (
              <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${getDifficultyColor(selectedProblem.difficulty)}`}>
                    {selectedProblem.difficulty}
                  </span>
                  <span className="text-white">{selectedProblem.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProblem(null)}
                  className="text-sm text-zinc-500 hover:text-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50">
                <input
                  type="text"
                  placeholder="Search for a problem..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-t-xl border-b border-zinc-700 bg-transparent px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
                <div className="max-h-48 overflow-y-auto">
                  {filteredProblems.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-zinc-500">No problems found</p>
                  ) : (
                    filteredProblems.slice(0, 10).map((problem) => (
                      <button
                        key={problem.id}
                        type="button"
                        onClick={() => {
                          setSelectedProblem(problem);
                          setSearchQuery("");
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-700/50"
                      >
                        <span className={`font-medium ${getDifficultyColor(problem.difficulty)}`}>
                          {problem.difficulty}
                        </span>
                        <span className="text-zinc-300">{problem.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Clean Python Solution with O(n) Time Complexity"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Language */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Language (optional)
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select language</option>
              <option value="Python">Python</option>
              <option value="C++">C++</option>
              <option value="Java">Java</option>
              <option value="JavaScript">JavaScript</option>
              <option value="Go">Go</option>
              <option value="Rust">Rust</option>
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Content <span className="text-red-400">*</span>
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              Explain your approach, include code snippets, and describe the time/space complexity.
            </p>
            <textarea
              placeholder="Write your editorial here... Include your approach, explanation, and code."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none font-mono"
              required
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? "Publishing..." : "Publish Editorial"}
            </button>
            <Link
              href="/community"
              className="rounded-xl px-6 py-3 text-sm font-medium text-zinc-400 hover:text-white"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
