"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { WeeklyContest } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getAdminToken(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("adminToken");
}

async function adminFetch(path: string, options: RequestInit = {}) {
    const token = getAdminToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });
    return res;
}

/* ─────────────────────────────────────────────
   Difficulty badge
───────────────────────────────────────────── */
function DiffBadge({ d }: { d: string }) {
    const map: Record<string, string> = {
        EASY: "bg-emerald-900/60 text-emerald-400 border-emerald-700/50",
        MEDIUM: "bg-amber-900/60 text-amber-400 border-amber-700/50",
        HARD: "bg-red-900/60 text-red-400 border-red-700/50",
    };
    return (
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold border ${map[d] || map.MEDIUM}`}>
            {d}
        </span>
    );
}

/* ─────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────── */
export default function AdminDashboard() {
    const router = useRouter();
    const [contests, setContests] = useState<WeeklyContest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
    const [prizes, setPrizes] = useState("");
    const [isActive, setIsActive] = useState(true);

    // Check auth
    useEffect(() => {
        if (!getAdminToken()) {
            router.push("/admin");
        }
    }, [router]);

    const fetchContests = useCallback(async () => {
        try {
            const res = await adminFetch("/api/admin/weekly-contests");
            if (res.status === 401 || res.status === 403) {
                sessionStorage.removeItem("adminToken");
                router.push("/admin");
                return;
            }
            const data = await res.json();
            setContests(data.contests);
        } catch {
            setError("Failed to fetch contests");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchContests();
    }, [fetchContests]);

    function resetForm() {
        setTitle("");
        setDescription("");
        setStartDate("");
        setEndDate("");
        setDifficulty("MEDIUM");
        setPrizes("");
        setIsActive(true);
        setEditingId(null);
        setShowForm(false);
        setError("");
    }

    function startEdit(c: WeeklyContest) {
        setTitle(c.title);
        setDescription(c.description || "");
        setStartDate(c.startDate.slice(0, 16)); // format for datetime-local
        setEndDate(c.endDate.slice(0, 16));
        setDifficulty(c.difficulty);
        setPrizes(c.prizes || "");
        setIsActive(c.isActive);
        setEditingId(c.id);
        setShowForm(true);
        setError("");
        setSuccess("");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");
        setSaving(true);

        try {
            const body = { title, description, startDate, endDate, difficulty, prizes, isActive };

            let res: Response;
            if (editingId) {
                res = await adminFetch(`/api/admin/weekly-contests/${editingId}`, {
                    method: "PUT",
                    body: JSON.stringify(body),
                });
            } else {
                res = await adminFetch("/api/admin/weekly-contests", {
                    method: "POST",
                    body: JSON.stringify(body),
                });
            }

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to save contest");
                return;
            }

            setSuccess(editingId ? "Contest updated!" : "Contest created!");
            resetForm();
            fetchContests();
        } catch {
            setError("Network error");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this weekly contest?")) return;
        setError("");
        setSuccess("");

        try {
            const res = await adminFetch(`/api/admin/weekly-contests/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                setError("Failed to delete contest");
                return;
            }
            setSuccess("Contest deleted");
            fetchContests();
        } catch {
            setError("Network error");
        }
    }

    function handleLogout() {
        sessionStorage.removeItem("adminToken");
        router.push("/admin");
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

            <div className="relative z-10 mx-auto max-w-5xl px-8 py-10 lg:px-16">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <span className="h-px w-5 bg-red-700" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-500/70">
                                Admin Panel
                            </span>
                        </div>
                        <h1 className="text-3xl font-light tracking-tight">
                            Weekly <span className="text-zinc-500">Contests</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { resetForm(); setShowForm(true); setSuccess(""); }}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:brightness-110 transition-all"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            New Contest
                        </button>
                        <button
                            onClick={handleLogout}
                            className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                        {success}
                    </div>
                )}

                {/* Create / Edit Form */}
                {showForm && (
                    <div className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                {editingId ? "Edit Contest" : "Create Weekly Contest"}
                            </h2>
                            <button onClick={resetForm} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        placeholder="Weekly Challenge #42"
                                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Describe the weekly challenge..."
                                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        required
                                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">End Date</label>
                                    <input
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        required
                                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">Difficulty</label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
                                    >
                                        <option value="EASY">Easy</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HARD">Hard</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">Prizes</label>
                                    <input
                                        type="text"
                                        value={prizes}
                                        onChange={(e) => setPrizes(e.target.value)}
                                        placeholder="e.g. Top 3 get premium badges"
                                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                                    />
                                </div>

                                <div className="flex items-center gap-3 sm:col-span-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 rounded-full bg-zinc-700 peer-checked:bg-emerald-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
                                    </label>
                                    <span className="text-sm text-zinc-400">Active</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:brightness-110 transition-all disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Saving…
                                        </>
                                    ) : editingId ? (
                                        "Update Contest"
                                    ) : (
                                        "Create Contest"
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm font-medium text-zinc-400 hover:bg-white/[0.04] transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Contest List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
                    </div>
                ) : contests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                            <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m3.044-1.35a6.726 6.726 0 01-2.748 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                            </svg>
                        </div>
                        <p className="text-sm text-zinc-600">No weekly contests yet.</p>
                        <p className="text-xs text-zinc-700 mt-1">Click "New Contest" to create one.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {contests.map((c) => {
                            const now = new Date();
                            const start = new Date(c.startDate);
                            const end = new Date(c.endDate);
                            const isLive = c.isActive && now >= start && now <= end;
                            const isPast = now > end;

                            return (
                                <div
                                    key={c.id}
                                    className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04] hover:border-white/[0.12]"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-base font-semibold text-zinc-100 truncate">{c.title}</h3>
                                                <DiffBadge d={c.difficulty} />
                                                {isLive && (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/40 border border-emerald-800/50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                                                        <span className="relative flex h-1.5 w-1.5">
                                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                        </span>
                                                        Live
                                                    </span>
                                                )}
                                                {isPast && (
                                                    <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.07] px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                                                        Ended
                                                    </span>
                                                )}
                                                {!c.isActive && (
                                                    <span className="inline-flex items-center rounded-full bg-red-900/30 border border-red-800/50 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                            {c.description && (
                                                <p className="text-sm text-zinc-500 truncate">{c.description}</p>
                                            )}
                                            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-zinc-600">
                                                <span>{new Date(c.startDate).toLocaleString()}</span>
                                                <span className="text-zinc-800">→</span>
                                                <span>{new Date(c.endDate).toLocaleString()}</span>
                                                {c.prizes && (
                                                    <span className="text-amber-600">🏆 {c.prizes}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => startEdit(c)}
                                                className="rounded-lg p-2 text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
