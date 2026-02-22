"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

interface Author {
  id: string;
  username: string;
  avatarUrl?: string;
  rating: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  tags?: string;
  createdAt: string;
  author: Author;
  _count: { comments: number; likes: number };
  liked: boolean;
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type Tab = "feed" | "editorials";

export default function CommunityPage() {
  const { user, hydrate, loading: authLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPagination, setPostsPagination] = useState<Pagination | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);

  // Editorials state
  const [editorials, setEditorials] = useState<Editorial[]>([]);
  const [editorialsPagination, setEditorialsPagination] = useState<Pagination | null>(null);
  const [editorialsLoading, setEditorialsLoading] = useState(true);

  // New post form
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTags, setNewPostTags] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    fetchPosts();
    fetchEditorials();
  }, []);

  const fetchPosts = async (page = 1) => {
    setPostsLoading(true);
    try {
      const { data } = await api.get(`/community/posts?page=${page}&limit=20`);
      setPosts(data.posts);
      setPostsPagination(data.pagination);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchEditorials = async (page = 1) => {
    setEditorialsLoading(true);
    try {
      const { data } = await api.get(`/community/editorials?page=${page}&limit=20`);
      setEditorials(data.editorials);
      setEditorialsPagination(data.pagination);
    } catch (err) {
      console.error("Failed to fetch editorials:", err);
    } finally {
      setEditorialsLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    setPostSubmitting(true);
    setPostError("");
    try {
      const { data } = await api.post("/community/posts", {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        tags: newPostTags.trim() || undefined,
      });
      setPosts((prev) => [{ ...data, liked: false, _count: { comments: 0, likes: 0 } }, ...prev]);
      setNewPostTitle("");
      setNewPostContent("");
      setNewPostTags("");
      setShowNewPost(false);
    } catch (err: any) {
      console.error("Failed to create post:", err);
      setPostError(
        err.response?.data?.error ||
        err.response?.data?.details?.[0]?.message ||
        "Failed to create post. Please try again."
      );
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;
    try {
      const { data } = await api.post(`/community/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked: data.liked,
                _count: {
                  ...p._count,
                  likes: data.liked ? p._count.likes + 1 : p._count.likes - 1,
                },
              }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to like post:", err);
    }
  };

  const handleVoteEditorial = async (editorialId: string, value: number) => {
    if (!user) return;
    try {
      const { data } = await api.post(`/community/editorials/${editorialId}/vote`, { value });
      setEditorials((prev) =>
        prev.map((e) =>
          e.id === editorialId
            ? { ...e, score: data.score, upvotes: data.upvotes, downvotes: data.downvotes, userVote: data.userVote }
            : e
        )
      );
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-zinc-100">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Community</h1>
          <p className="mt-2 text-zinc-500">
            Share knowledge, discuss problems, and contribute editorials
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "feed"
                ? "border-b-2 border-blue-500 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            General Feed
          </button>
          <button
            onClick={() => setActiveTab("editorials")}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "editorials"
                ? "border-b-2 border-blue-500 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Community Editorials
          </button>
        </div>

        {/* Feed Tab */}
        {activeTab === "feed" && (
          <div>
            {/* New Post Button */}
            {user && !showNewPost && (
              <button
                onClick={() => setShowNewPost(true)}
                className="mb-6 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-3 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Post
              </button>
            )}

            {/* New Post Form */}
            {showNewPost && (
              <form onSubmit={handleCreatePost} className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-4 font-semibold text-white">Create a Post</h3>
                
                {postError && (
                  <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                    {postError}
                  </div>
                )}
                
                <input
                  type="text"
                  placeholder="Title (min. 3 characters)"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  minLength={3}
                  className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  required
                />
                <textarea
                  placeholder="Share your thoughts, questions, or insights... (min. 10 characters)"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={5}
                  minLength={10}
                  className="mb-3 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Tags (comma-separated, e.g., algorithms, dp, graphs)"
                  value={newPostTags}
                  onChange={(e) => setNewPostTags(e.target.value)}
                  className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={postSubmitting}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                  >
                    {postSubmitting ? "Posting..." : "Post"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewPost(false)}
                    className="rounded-xl px-5 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Posts List */}
            {postsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
                    <div className="mb-3 h-5 w-2/3 rounded bg-zinc-800" />
                    <div className="mb-2 h-4 w-full rounded bg-zinc-800" />
                    <div className="h-4 w-1/2 rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center">
                <p className="text-zinc-500">No posts yet. Be the first to share something!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/community/posts/${post.id}`}
                    className="block rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                      <span className="text-xs text-zinc-600">{formatDate(post.createdAt)}</span>
                    </div>
                    <p className="mb-4 line-clamp-2 text-sm text-zinc-400">{post.content}</p>
                    {post.tags && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {post.tags.split(",").map((tag, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] font-bold text-white">
                          {post.author.username.charAt(0).toUpperCase()}
                        </div>
                        <span>{post.author.username}</span>
                        <span className="text-zinc-700">({post.author.rating})</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleLikePost(post.id);
                        }}
                        className={`flex items-center gap-1 transition-colors ${
                          post.liked ? "text-red-400" : "hover:text-red-400"
                        }`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill={post.liked ? "currentColor" : "none"}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                        {post._count.likes}
                      </button>
                      <div className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        {post._count.comments}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {postsPagination && postsPagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => fetchPosts(postsPagination.page - 1)}
                  disabled={postsPagination.page === 1}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 text-sm text-zinc-500">
                  Page {postsPagination.page} of {postsPagination.totalPages}
                </span>
                <button
                  onClick={() => fetchPosts(postsPagination.page + 1)}
                  disabled={postsPagination.page === postsPagination.totalPages}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Editorials Tab */}
        {activeTab === "editorials" && (
          <div>
            {/* Create Editorial Link */}
            {user && (
              <Link
                href="/community/editorials/new"
                className="mb-6 inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-3 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Write an Editorial
              </Link>
            )}

            {/* Editorials List */}
            {editorialsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
                    <div className="mb-3 h-5 w-2/3 rounded bg-zinc-800" />
                    <div className="mb-2 h-4 w-1/3 rounded bg-zinc-800" />
                    <div className="h-4 w-full rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : editorials.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center">
                <p className="text-zinc-500">
                  No community editorials yet. Help others by writing one!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {editorials.map((editorial) => (
                  <Link
                    key={editorial.id}
                    href={`/community/editorials/${editorial.id}`}
                    className="block rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Link
                        href={`/problems/${editorial.problem.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-sm font-medium ${getDifficultyColor(editorial.problem.difficulty)} hover:underline`}
                      >
                        {editorial.problem.title}
                      </Link>
                      {editorial.language && (
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                          {editorial.language}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-white">{editorial.title}</h3>
                    <p className="mb-4 line-clamp-2 text-sm text-zinc-400">{editorial.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] font-bold text-white">
                            {editorial.author.username.charAt(0).toUpperCase()}
                          </div>
                          <span>{editorial.author.username}</span>
                        </div>
                        <span className="text-zinc-700">{formatDate(editorial.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVoteEditorial(
                              editorial.id,
                              editorial.userVote === 1 ? 0 : 1
                            );
                          }}
                          className={`rounded p-1 transition-colors ${
                            editorial.userVote === 1
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                          }`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <span
                          className={`min-w-[2rem] text-center text-sm font-medium ${
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
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVoteEditorial(
                              editorial.id,
                              editorial.userVote === -1 ? 0 : -1
                            );
                          }}
                          className={`rounded p-1 transition-colors ${
                            editorial.userVote === -1
                              ? "bg-red-500/20 text-red-400"
                              : "text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                          }`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {editorialsPagination && editorialsPagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => fetchEditorials(editorialsPagination.page - 1)}
                  disabled={editorialsPagination.page === 1}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 text-sm text-zinc-500">
                  Page {editorialsPagination.page} of {editorialsPagination.totalPages}
                </span>
                <button
                  onClick={() => fetchEditorials(editorialsPagination.page + 1)}
                  disabled={editorialsPagination.page === editorialsPagination.totalPages}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
