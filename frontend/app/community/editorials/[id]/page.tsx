"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

interface Author {
  id: string;
  username: string;
  avatarUrl?: string;
  rating: number;
}

interface Editorial {
  id: string;
  title: string;
  content: string;
  language?: string;
  createdAt: string;
  author: Author;
  problem: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
  };
  score: number;
  upvotes: number;
  downvotes: number;
  userVote: number;
}

export default function EditorialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hydrate } = useAuthStore();
  const [editorial, setEditorial] = useState<Editorial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (params.id) {
      fetchEditorial();
    }
  }, [params.id]);

  const fetchEditorial = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/community/editorials/${params.id}`);
      setEditorial(data);
    } catch (err) {
      console.error("Failed to fetch editorial:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (value: number) => {
    if (!user || !editorial) return;
    try {
      const { data } = await api.post(`/community/editorials/${editorial.id}/vote`, { value });
      setEditorial((prev) =>
        prev
          ? {
              ...prev,
              score: data.score,
              upvotes: data.upvotes,
              downvotes: data.downvotes,
              userVote: data.userVote,
            }
          : null
      );
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  const handleDelete = async () => {
    if (!editorial || !confirm("Are you sure you want to delete this editorial?")) return;
    try {
      await api.delete(`/community/editorials/${editorial.id}`);
      router.push("/community");
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "text-emerald-400 bg-emerald-500/10";
      case "MEDIUM":
        return "text-amber-400 bg-amber-500/10";
      case "HARD":
        return "text-red-400 bg-red-500/10";
      default:
        return "text-zinc-400 bg-zinc-500/10";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-zinc-100">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="animate-pulse">
            <div className="mb-4 h-6 w-1/4 rounded bg-zinc-800" />
            <div className="mb-4 h-8 w-3/4 rounded bg-zinc-800" />
            <div className="mb-8 h-4 w-1/3 rounded bg-zinc-800" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-zinc-800" />
              <div className="h-4 w-full rounded bg-zinc-800" />
              <div className="h-4 w-2/3 rounded bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!editorial) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-zinc-100">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center">
          <h1 className="text-2xl font-bold text-white">Editorial not found</h1>
          <Link href="/community" className="mt-4 inline-block text-blue-400 hover:underline">
            Back to Community
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

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        {/* Back link */}
        <Link
          href="/community"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Community
        </Link>

        <div className="flex gap-6">
          {/* Voting sidebar */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              onClick={() => handleVote(editorial.userVote === 1 ? 0 : 1)}
              disabled={!user}
              className={`rounded-lg p-2 transition-colors ${
                editorial.userVote === 1
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span
              className={`text-xl font-bold ${
                editorial.score > 0
                  ? "text-emerald-400"
                  : editorial.score < 0
                  ? "text-red-400"
                  : "text-zinc-500"
              }`}
            >
              {editorial.score}
            </span>
            <button
              onClick={() => handleVote(editorial.userVote === -1 ? 0 : -1)}
              disabled={!user}
              className={`rounded-lg p-2 transition-colors ${
                editorial.userVote === -1
                  ? "bg-red-500/20 text-red-400"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Main content */}
          <article className="flex-1">
            {/* Problem link */}
            <Link
              href={`/problems/${editorial.problem.slug}`}
              className={`mb-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${getDifficultyColor(editorial.problem.difficulty)} hover:brightness-110`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              {editorial.problem.title}
            </Link>

            <h1 className="mb-4 text-2xl font-bold text-white">{editorial.title}</h1>

            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <Link
                  href={`/profile/${editorial.author.username}`}
                  className="flex items-center gap-2 hover:text-white"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
                    {editorial.author.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{editorial.author.username}</span>
                  <span className="text-zinc-700">({editorial.author.rating})</span>
                </Link>
                <span className="text-zinc-700">•</span>
                <span>{formatDate(editorial.createdAt)}</span>
                {editorial.language && (
                  <>
                    <span className="text-zinc-700">•</span>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs">{editorial.language}</span>
                  </>
                )}
              </div>
              {user && user.id === editorial.author.id && (
                <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-300">
                  Delete
                </button>
              )}
            </div>

            {/* Content */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 leading-relaxed">
                  {editorial.content}
                </pre>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 flex items-center gap-6 text-sm text-zinc-500">
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 15l7-7 7 7" />
                </svg>
                {editorial.upvotes} upvotes
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
                {editorial.downvotes} downvotes
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
