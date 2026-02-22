"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import type { RoadmapData, RoadmapLevel } from "@/lib/types";
import LevelPath from "@/components/LevelPath";

const DIFFICULTY_COLORS = {
  EASY: "text-emerald-400",
  MEDIUM: "text-amber-400",
  HARD: "text-red-400",
};

const DIFFICULTY_BG = {
  EASY: "bg-emerald-900/50 text-emerald-400 border border-emerald-800/60",
  MEDIUM: "bg-amber-900/50 text-amber-400 border border-amber-800/60",
  HARD: "bg-red-900/50 text-red-400 border border-red-800/60",
};

const LevelIcons: { [key: string]: React.JSX.Element } = {
  "First Steps": (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M13 10V3L4 14h7v7l9-11h-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Getting Started": (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Basic Logic": (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Loop Basics": (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Recursion: (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Mastery: (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m3.044-1.35a6.726 6.726 0 01-2.748 1.35m0 0a6.772 6.772 0 01-3.044 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const DefaultIcon = (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBadges, setShowBadges] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchRoadmap() {
      try {
        const response = await api.get("/roadmap");
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch roadmap:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRoadmap();
  }, []);

  useEffect(() => {
    if (data && mapRef.current) {
      const el = document.getElementById(
        `level-${data.userProgress.currentLevel}`,
      );
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [data]);

  function scrollToLevel(id: number) {
    const el = document.getElementById(`level-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
          <p className="font-mono text-xs text-zinc-700">Loading roadmap…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-xs text-zinc-700 mb-4">
            Failed to load roadmap
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-white/[0.10] bg-transparent px-5 py-2 text-sm font-medium text-zinc-300 hover:border-white/20 hover:bg-white/[0.05] transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { levels, userProgress } = data;
  const completedCount = levels.filter((l) => l.isCompleted).length;
  const progressPercent = (completedCount / levels.length) * 100;

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

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0e0e0e]/80 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/problems"
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <div className="flex items-center gap-2">
                <span className="h-px w-5 bg-zinc-700" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  Learning path
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBadges(true)}
                className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 hover:border-white/[0.12] hover:bg-white/[0.05] transition-all"
              >
                <svg
                  className="w-3.5 h-3.5 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>{userProgress.earnedBadges.length} badges</span>
              </button>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs">
                <span className="text-zinc-200 font-medium font-mono">
                  {userProgress.totalPoints}
                </span>
                <span className="text-zinc-600">pts</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                Overall progress
              </span>
              <span className="font-mono text-[10px] text-zinc-600">
                {completedCount} / {levels.length} levels
              </span>
            </div>
            <div className="h-px bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-300 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── Page title ── */}
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-2">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-px w-5 bg-zinc-700" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            Roadmap
          </span>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-zinc-100">
          Your{" "}
          <em
            className="not-italic text-zinc-400"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            learning journey
          </em>
          .
        </h1>
      </div>

      {/* ── Layout: roadmap + mini map ── */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-6 items-start">
          {/* ── Left: main roadmap ── */}
          <div ref={mapRef} className="flex-1 relative">
            {/* SVG curved path behind */}
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 0 }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="pathGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#3f3f46" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#27272a" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              {levels.map((_, index) => {
                if (index === levels.length - 1) return null;
                const isEven = index % 2 === 0;
                const y1 = 100 + index * 180;
                const y2 = 100 + (index + 1) * 180;
                const x1 = isEven ? "18%" : "82%";
                const x2 = isEven ? "82%" : "18%";
                const cx1 = isEven ? "58%" : "42%";
                const cx2 = isEven ? "42%" : "58%";
                return (
                  <path
                    key={index}
                    d={`M ${x1} ${y1} C ${cx1} ${y1 + 60}, ${cx2} ${y2 - 60}, ${x2} ${y2}`}
                    fill="none"
                    stroke="url(#pathGradient)"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                );
              })}
            </svg>

            {/* Level nodes */}
            <div className="relative z-10 space-y-8">
              {levels.map((level, index) => {
                const isEven = index % 2 === 0;
                const isCurrentLevel = level.id === userProgress.currentLevel;
                const icon = LevelIcons[level.name] || DefaultIcon;

                return (
                  <div
                    key={level.id}
                    id={`level-${level.id}`}
                    className={`flex items-center gap-6 ${isEven ? "flex-row" : "flex-row-reverse"} ${!level.isUnlocked ? "opacity-40" : ""}`}
                  >
                    <div className={`flex-1 ${isEven ? "max-w-[10%]" : ""}`} />

                    {/* Card */}
                    <div
                      className={`relative flex-1 max-w-lg transition-all duration-300 ${isCurrentLevel ? "scale-[1.02]" : ""}`}
                    >
                      {/* Connector dot */}
                      <div
                        className={`absolute ${isEven ? "-right-7" : "-left-7"} top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border ${
                          level.isCompleted
                            ? "bg-zinc-800 border-zinc-300"
                            : isCurrentLevel
                              ? "bg-zinc-800 border-zinc-500 shadow-[0_0_10px_rgba(161,161,170,0.2)]"
                              : level.isUnlocked
                                ? "bg-zinc-900 border-zinc-600"
                                : "bg-zinc-900 border-zinc-800"
                        }`}
                      >
                        {level.isCompleted && (
                          <svg
                            className="w-full h-full p-1 text-zinc-300"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        {isCurrentLevel && !level.isCompleted && (
                          <div className="absolute inset-1 rounded-full bg-zinc-400 animate-pulse" />
                        )}
                      </div>

                      {/* Main card */}
                      <div
                        className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
                          level.isCompleted
                            ? "border-white/[0.10] bg-white/[0.03] hover:bg-white/[0.05]"
                            : isCurrentLevel
                              ? "border-white/[0.12] bg-white/[0.04] shadow-[0_0_30px_rgba(255,255,255,0.04)]"
                              : level.isUnlocked
                                ? "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10]"
                                : "border-white/[0.04] bg-transparent"
                        }`}
                      >
                        {/* Card header */}
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                                level.isCompleted
                                  ? "border-white/[0.10] bg-white/[0.05] text-zinc-300"
                                  : isCurrentLevel
                                    ? "border-white/[0.12] bg-white/[0.06] text-zinc-200"
                                    : level.isUnlocked
                                      ? "border-white/[0.07] bg-white/[0.03] text-zinc-500"
                                      : "border-white/[0.04] bg-transparent text-zinc-700"
                              }`}
                            >
                              {level.isUnlocked ? (
                                icon
                              ) : (
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="font-mono text-[10px] text-zinc-600">
                                  LVL {String(level.id).padStart(2, "0")}
                                </span>
                                {isCurrentLevel && (
                                  <span className="rounded-full bg-zinc-800 border border-zinc-600 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                                    Current
                                  </span>
                                )}
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${DIFFICULTY_BG[level.problemDifficulty]}`}
                                >
                                  {level.problemDifficulty}
                                </span>
                              </div>
                              <h3
                                className={`text-base font-medium tracking-tight ${level.isUnlocked ? "text-zinc-100" : "text-zinc-600"}`}
                              >
                                {level.name}
                              </h3>
                              <p
                                className={`text-xs mt-0.5 leading-relaxed ${level.isUnlocked ? "text-zinc-500" : "text-zinc-700"}`}
                              >
                                {level.description}
                              </p>
                            </div>

                            {!level.isUnlocked && (
                              <div className="text-right shrink-0">
                                <div className="font-mono text-[10px] text-zinc-700">
                                  Unlock at
                                </div>
                                <div className="font-mono text-xs text-zinc-600">
                                  {level.requiredPoints} pts
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Divider */}
                        {level.isUnlocked && (
                          <div className="border-t border-white/[0.05]" />
                        )}

                        {/* Problem section */}
                        {level.problem && level.isUnlocked && (
                          <div className="p-4">
                            <div
                              className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
                                level.problem.solved
                                  ? "border-emerald-900/60 bg-emerald-950/30"
                                  : "border-white/[0.06] bg-white/[0.02]"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    level.problem.solved
                                      ? "bg-emerald-900/60 border border-emerald-800/60"
                                      : "bg-white/[0.04] border border-white/[0.07]"
                                  }`}
                                >
                                  {level.problem.solved ? (
                                    <svg
                                      className="w-4 h-4 text-emerald-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-4 h-4 text-zinc-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4
                                    className={`text-sm font-medium truncate ${level.problem.solved ? "text-emerald-300" : "text-zinc-200"}`}
                                  >
                                    {level.problem.title}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="font-mono text-[10px] text-zinc-600">
                                      +{level.problem.points} pts
                                    </span>
                                    {level.problem.solved && (
                                      <span className="font-mono text-[10px] text-emerald-600">
                                        Solved
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {!level.problem.solved && (
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/problems/${level.problem?.slug}`,
                                    )
                                  }
                                  className="rounded-xl border border-zinc-100 bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10 shrink-0"
                                >
                                  Solve →
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* No problem */}
                        {!level.problem && level.isUnlocked && (
                          <div className="p-4">
                            <div className="rounded-xl border border-white/[0.04] bg-transparent p-3 text-center">
                              <p className="font-mono text-[10px] text-zinc-700">
                                Coming soon
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Locked */}
                        {!level.isUnlocked && (
                          <div className="px-5 pb-5">
                            <div className="rounded-xl border border-white/[0.04] bg-transparent px-4 py-3 flex items-center justify-center gap-2">
                              <svg
                                className="w-3 h-3 text-zinc-700"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="font-mono text-[10px] text-zinc-700">
                                {level.requiredPoints -
                                  userProgress.totalPoints}{" "}
                                more points to unlock
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Badge */}
                        {level.isCompleted && (
                          <div className="px-5 pb-5">
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-900/50 bg-amber-950/30 px-3 py-1">
                              <svg
                                className="w-3 h-3 text-amber-500"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-[10px] font-medium text-amber-500">
                                {level.badge.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`flex-1 ${!isEven ? "max-w-[10%]" : ""}`} />
                  </div>
                );
              })}
            </div>

            {/* Finish */}
            <div className="flex justify-center mt-12">
              <div className="flex flex-col items-center gap-2 text-zinc-700">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                  />
                </svg>
                <span className="font-mono text-[10px] text-zinc-700">
                  Complete all levels to become a master
                </span>
              </div>
            </div>
          </div>

          {/* ── Right: level path ── */}
          <div className="w-60 shrink-0 hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm p-3">
              <div className="mb-2 flex items-center justify-center gap-1.5">
                <span className="h-px w-3 bg-zinc-700" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                  Map
                </span>
                <span className="h-px w-3 bg-zinc-700" />
              </div>
              <LevelPath
                levels={levels.length}
                completedLevel={completedCount}
                onNodeClick={(n) => {
                  const lvl = levels[n - 1];
                  if (lvl) scrollToLevel(lvl.id);
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* ── Badges modal ── */}
      {showBadges && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowBadges(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-zinc-900/90 backdrop-blur-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-px w-5 bg-zinc-700" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  Badges earned
                </span>
              </div>
              <button
                onClick={() => setShowBadges(false)}
                className="w-7 h-7 rounded-lg border border-white/[0.07] bg-white/[0.03] flex items-center justify-center text-zinc-600 hover:text-zinc-200 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
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
              </button>
            </div>

            <div className="p-5 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-4 gap-3">
                {levels.map((level) => {
                  const isEarned = userProgress.earnedBadges.includes(
                    level.badge.name,
                  );
                  return (
                    <div
                      key={level.id}
                      className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                        isEarned
                          ? "border-white/[0.08] bg-white/[0.03]"
                          : "border-white/[0.03] bg-transparent opacity-30"
                      }`}
                      title={`${level.badge.name}`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-2 border border-white/[0.06]"
                        style={
                          isEarned
                            ? { color: level.badge.color }
                            : { color: "#3f3f46" }
                        }
                      >
                        {level.badge.icon}
                      </div>
                      <p className="font-mono text-[9px] text-center text-zinc-600 truncate w-full">
                        {level.badge.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/[0.05] px-5 py-3 flex items-center justify-between">
              <span className="font-mono text-[10px] text-zinc-600">
                {userProgress.earnedBadges.length} of {levels.length} earned
              </span>
              <span className="font-mono text-[10px] text-zinc-400">
                {userProgress.totalPoints} pts total
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
