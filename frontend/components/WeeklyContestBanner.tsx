"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WeeklyContest } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function WeeklyContestBanner() {
    const [contests, setContests] = useState<WeeklyContest[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/weekly-contests`);
                const data = await res.json();
                setContests(data.contests || []);
            } catch {
                /* silent */
            }
        })();
    }, []);

    if (contests.length === 0) return null;

    const diffColor: Record<string, { gradient: string; badge: string; shadow: string }> = {
        EASY: {
            gradient: "from-emerald-600/20 via-emerald-500/10 to-transparent",
            badge: "bg-emerald-900/60 text-emerald-400 border-emerald-700/50",
            shadow: "shadow-emerald-500/10",
        },
        MEDIUM: {
            gradient: "from-amber-600/20 via-amber-500/10 to-transparent",
            badge: "bg-amber-900/60 text-amber-400 border-amber-700/50",
            shadow: "shadow-amber-500/10",
        },
        HARD: {
            gradient: "from-red-600/20 via-red-500/10 to-transparent",
            badge: "bg-red-900/60 text-red-400 border-red-700/50",
            shadow: "shadow-red-500/10",
        },
    };

    return (
        <div className="space-y-3">
            {contests.map((c) => {
                const colors = diffColor[c.difficulty] || diffColor.MEDIUM;
                const end = new Date(c.endDate);
                const now = new Date();
                const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                return (
                    <div
                        key={c.id}
                        className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r ${colors.gradient} backdrop-blur-sm p-6 ${colors.shadow} shadow-lg transition-all hover:border-white/[0.14]`}
                    >
                        {/* Animated background pulse */}
                        <div className="absolute inset-0 opacity-30">
                            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/[0.03] animate-pulse" />
                            <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/[0.02] animate-pulse delay-1000" />
                        </div>

                        <div className="relative flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        </span>
                                        Weekly Contest
                                    </span>
                                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold border ${colors.badge}`}>
                                        {c.difficulty}
                                    </span>
                                </div>

                                <h3 className="text-lg font-semibold text-zinc-100 mb-1">{c.title}</h3>

                                {c.description && (
                                    <p className="text-sm text-zinc-500 mb-2 line-clamp-2">{c.description}</p>
                                )}

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                                    <span className="flex items-center gap-1.5">
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                                    </span>
                                    {c.prizes && (
                                        <span className="flex items-center gap-1.5 text-amber-500/80">
                                            🏆 {c.prizes}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <Link
                                href="/contests"
                                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white/[0.08] border border-white/[0.10] px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/[0.12] hover:border-white/[0.18] transition-all"
                            >
                                View Contests
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
