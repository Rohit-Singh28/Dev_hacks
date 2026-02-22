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
  rating?: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  replies?: Comment[];
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
  comments: Comment[];
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hydrate } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (params.id) {
      fetchPost();
    }
  }, [params.id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/community/posts/${params.id}`);
      setPost(data);
    } catch (err) {
      console.error("Failed to fetch post:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || !post) return;
    try {
      const { data } = await api.post(`/community/posts/${post.id}/like`);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              liked: data.liked,
              _count: {
                ...prev._count,
                likes: data.liked ? prev._count.likes + 1 : prev._count.likes - 1,
              },
            }
          : null
      );
    } catch (err) {
      console.error("Failed to like post:", err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post) return;

    setSubmitting(true);
    try {
      const { data } = await api.post(`/community/posts/${post.id}/comments`, {
        content: newComment.trim(),
      });
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comments: [...prev.comments, { ...data, replies: [] }],
              _count: { ...prev._count, comments: prev._count.comments + 1 },
            }
          : null
      );
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !post) return;

    setSubmitting(true);
    try {
      const { data } = await api.post(`/community/posts/${post.id}/comments`, {
        content: replyContent.trim(),
        parentId,
      });
      setPost((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          comments: prev.comments.map((c) =>
            c.id === parentId ? { ...c, replies: [...(c.replies || []), data] } : c
          ),
          _count: { ...prev._count, comments: prev._count.comments + 1 },
        };
      });
      setReplyContent("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Failed to reply:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !confirm("Are you sure you want to delete this post?")) return;
    try {
      await api.delete(`/community/posts/${post.id}`);
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-zinc-100">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="animate-pulse">
            <div className="mb-4 h-8 w-3/4 rounded bg-zinc-800" />
            <div className="mb-8 h-4 w-1/4 rounded bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-zinc-800" />
              <div className="h-4 w-full rounded bg-zinc-800" />
              <div className="h-4 w-2/3 rounded bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-zinc-100">
        <div className="mx-auto max-w-3xl px-6 py-10 text-center">
          <h1 className="text-2xl font-bold text-white">Post not found</h1>
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

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
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

        {/* Post */}
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
          <h1 className="mb-4 text-2xl font-bold text-white">{post.title}</h1>

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <Link
                href={`/profile/${post.author.username}`}
                className="flex items-center gap-2 hover:text-white"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
                  {post.author.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{post.author.username}</span>
              </Link>
              <span className="text-zinc-700">•</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
            {user && user.id === post.author.id && (
              <button
                onClick={handleDelete}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            )}
          </div>

          {post.tags && (
            <div className="mb-6 flex flex-wrap gap-2">
              {post.tags.split(",").map((tag, i) => (
                <span key={i} className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          <div className="prose prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-zinc-300">{post.content}</p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center gap-4 border-t border-zinc-800 pt-6">
            <button
              onClick={handleLike}
              disabled={!user}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${
                post.liked
                  ? "bg-red-500/10 text-red-400"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <svg
                className="h-5 w-5"
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
              {post._count.likes} {post._count.likes === 1 ? "Like" : "Likes"}
            </button>
            <span className="text-sm text-zinc-500">
              {post._count.comments} {post._count.comments === 1 ? "Comment" : "Comments"}
            </span>
          </div>
        </article>

        {/* Comments Section */}
        <div className="mt-8">
          <h2 className="mb-6 text-lg font-semibold text-white">Comments</h2>

          {/* Add Comment Form */}
          {user ? (
            <form onSubmit={handleAddComment} className="mb-8">
              <textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="mb-3 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {submitting ? "Posting..." : "Post Comment"}
              </button>
            </form>
          ) : (
            <p className="mb-8 text-sm text-zinc-500">
              <Link href="/login" className="text-blue-400 hover:underline">
                Log in
              </Link>{" "}
              to leave a comment.
            </p>
          )}

          {/* Comments List */}
          {post.comments.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">No comments yet.</p>
          ) : (
            <div className="space-y-6">
              {post.comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm">
                    <Link
                      href={`/profile/${comment.author.username}`}
                      className="flex items-center gap-2 text-zinc-300 hover:text-white"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] font-bold text-white">
                        {comment.author.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{comment.author.username}</span>
                    </Link>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-600">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">{comment.content}</p>

                  {/* Reply button */}
                  {user && (
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="mt-3 text-xs text-zinc-500 hover:text-white"
                    >
                      Reply
                    </button>
                  )}

                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="mt-4 pl-4 border-l-2 border-zinc-700">
                      <textarea
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={2}
                        className="mb-2 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReply(comment.id)}
                          disabled={submitting || !replyContent.trim()}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent("");
                          }}
                          className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-zinc-800">
                      {comment.replies.map((reply) => (
                        <div key={reply.id}>
                          <div className="mb-2 flex items-center gap-2 text-sm">
                            <Link
                              href={`/profile/${reply.author.username}`}
                              className="flex items-center gap-2 text-zinc-300 hover:text-white"
                            >
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[9px] font-bold text-white">
                                {reply.author.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{reply.author.username}</span>
                            </Link>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-600">{formatDate(reply.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-zinc-400">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
