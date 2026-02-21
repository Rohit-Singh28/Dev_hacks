"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import type { RoadmapData, RoadmapLevel } from "@/lib/types";

// Difficulty colors
const DIFFICULTY_COLORS = {
  EASY: "text-emerald-400",
  MEDIUM: "text-amber-400",
  HARD: "text-red-400",
};

const DIFFICULTY_BG = {
  EASY: "bg-emerald-500/10 border-emerald-500/30",
  MEDIUM: "bg-amber-500/10 border-amber-500/30",
  HARD: "bg-red-500/10 border-red-500/30",
};

// SVG Icons for different level themes
const LevelIcons: { [key: string]: React.JSX.Element } = {
  "First Steps": (
    <svg
      className="w-6 h-6"
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
      className="w-6 h-6"
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
      className="w-6 h-6"
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
      className="w-6 h-6"
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
  "Array Fundamentals": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "String Operations": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Problem Solving": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Intermediate Logic": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Advanced Arrays": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Recursion: (
    <svg
      className="w-6 h-6"
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
  "Sorting Algorithms": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Searching Techniques": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Data Structures": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Graph Basics": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Dynamic Programming": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "Advanced Algorithms": (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Optimization: (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Mastery: (
    <svg
      className="w-6 h-6"
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

// Default icon for levels without specific icons
const DefaultIcon = (
  <svg
    className="w-6 h-6"
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

  // Auto-scroll to current level
  useEffect(() => {
    if (data && mapRef.current) {
      const currentLevelEl = document.getElementById(
        `level-${data.userProgress.currentLevel}`,
      );
      if (currentLevelEl) {
        currentLevelEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-lg">Failed to load roadmap</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition"
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
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/problems"
                className="text-zinc-400 hover:text-white transition"
              >
                <svg
                  className="w-5 h-5"
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
              <h1 className="text-xl font-semibold text-white">
                Learning Path
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBadges(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition"
              >
                <svg
                  className="w-4 h-4 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>{userProgress.earnedBadges.length} Badges</span>
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                <span className="text-blue-400 font-medium">
                  {userProgress.totalPoints}
                </span>
                <span className="text-zinc-500">points</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span>Overall Progress</span>
              <span>
                {completedCount} / {levels.length} levels completed
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main roadmap with zigzag path */}
      <main ref={mapRef} className="max-w-5xl mx-auto px-4 py-12">
        <div className="relative">
          {/* SVG Curved Path */}
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
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.6" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {levels.map((_, index) => {
              if (index === levels.length - 1) return null;
              const isEven = index % 2 === 0;
              const y1 = 100 + index * 180;
              const y2 = 100 + (index + 1) * 180;
              const x1 = isEven ? "20%" : "80%";
              const x2 = isEven ? "80%" : "20%";
              const cx1 = isEven ? "60%" : "40%";
              const cx2 = isEven ? "40%" : "60%";

              return (
                <path
                  key={index}
                  d={`M ${x1} ${y1} C ${cx1} ${y1 + 60}, ${cx2} ${y2 - 60}, ${x2} ${y2}`}
                  fill="none"
                  stroke="url(#pathGradient)"
                  strokeWidth="3"
                  strokeDasharray="8 4"
                  filter="url(#glow)"
                  className="opacity-40"
                />
              );
            })}
          </svg>

          {/* Level nodes in zigzag pattern */}
          <div className="relative z-10 space-y-8">
            {levels.map((level, index) => {
              const isEven = index % 2 === 0;
              const isCurrentLevel = level.id === userProgress.currentLevel;
              const problem = level.problem;
              const icon = LevelIcons[level.name] || DefaultIcon;

              return (
                <div
                  key={level.id}
                  id={`level-${level.id}`}
                  className={`flex items-center gap-6 ${isEven ? "flex-row" : "flex-row-reverse"} ${!level.isUnlocked ? "opacity-50" : ""}`}
                >
                  {/* Spacer for zigzag effect */}
                  <div className={`flex-1 ${isEven ? "max-w-[10%]" : ""}`} />

                  {/* Level Card */}
                  <div
                    className={`relative flex-1 max-w-lg transition-all duration-300 ${
                      isCurrentLevel ? "scale-[1.02]" : ""
                    }`}
                  >
                    {/* Decorative connector dot */}
                    <div
                      className={`absolute ${isEven ? "-right-3" : "-left-3"} top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 ${
                        level.isCompleted
                          ? "bg-emerald-500 border-emerald-400"
                          : isCurrentLevel
                            ? "bg-blue-500 border-blue-400 animate-pulse"
                            : level.isUnlocked
                              ? "bg-zinc-700 border-zinc-600"
                              : "bg-zinc-800 border-zinc-700"
                      }`}
                    >
                      {level.isCompleted && (
                        <svg
                          className="w-full h-full p-1 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Main Card */}
                    <div
                      className={`p-5 rounded-xl border-2 backdrop-blur-sm transition-all ${
                        level.isCompleted
                          ? "bg-emerald-500/5 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                          : isCurrentLevel
                            ? "bg-blue-500/5 border-blue-500/40 shadow-lg shadow-blue-500/20"
                            : level.isUnlocked
                              ? "bg-zinc-900/80 border-zinc-700 hover:border-zinc-600"
                              : "bg-zinc-900/50 border-zinc-800"
                      }`}
                    >
                      {/* Level header with icon */}
                      <div className="flex items-start gap-4 mb-4">
                        {/* Icon container */}
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                            level.isCompleted
                              ? "bg-emerald-500/20 text-emerald-400"
                              : isCurrentLevel
                                ? "bg-blue-500/20 text-blue-400"
                                : level.isUnlocked
                                  ? "bg-zinc-800 text-zinc-400"
                                  : "bg-zinc-800/50 text-zinc-600"
                          }`}
                        >
                          {level.isUnlocked ? (
                            icon
                          ) : (
                            <svg
                              className="w-5 h-5"
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

                        {/* Level info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded ${
                                level.isCompleted
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : isCurrentLevel
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              Level {level.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs rounded border ${DIFFICULTY_BG[level.problemDifficulty]} ${DIFFICULTY_COLORS[level.problemDifficulty]}`}
                            >
                              {level.problemDifficulty}
                            </span>
                          </div>
                          <h3
                            className={`text-lg font-semibold ${level.isUnlocked ? "text-white" : "text-zinc-500"}`}
                          >
                            {level.name}
                          </h3>
                          <p
                            className={`text-sm ${level.isUnlocked ? "text-zinc-400" : "text-zinc-600"}`}
                          >
                            {level.description}
                          </p>
                        </div>

                        {/* Points badge */}
                        {!level.isUnlocked && (
                          <div className="text-right shrink-0">
                            <div className="text-xs text-zinc-500">
                              Unlock at
                            </div>
                            <div className="text-sm font-medium text-zinc-400">
                              {level.requiredPoints} pts
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Problem section */}
                      {problem && level.isUnlocked && (
                        <div
                          className={`p-4 rounded-lg border ${
                            problem.solved
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "bg-zinc-800/50 border-zinc-700/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                  problem.solved
                                    ? "bg-emerald-500 text-white"
                                    : "bg-zinc-700 text-zinc-300"
                                }`}
                              >
                                {problem.solved ? (
                                  <svg
                                    className="w-5 h-5"
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
                                  <svg
                                    className="w-5 h-5"
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
                                  className={`font-medium truncate ${problem.solved ? "text-emerald-300" : "text-white"}`}
                                >
                                  {problem.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-blue-400 font-medium">
                                    +{problem.points} pts
                                  </span>
                                  {problem.solved && (
                                    <span className="text-emerald-400">
                                      Completed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {!problem.solved && (
                              <button
                                onClick={() =>
                                  router.push(`/problems/${problem.slug}`)
                                }
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all hover:scale-105 shrink-0"
                              >
                                Solve Now
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* No problem assigned */}
                      {!problem && level.isUnlocked && (
                        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800 text-center">
                          <div className="text-zinc-600 mb-1">
                            <svg
                              className="w-8 h-8 mx-auto"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                          </div>
                          <p className="text-sm text-zinc-500">Coming soon</p>
                        </div>
                      )}

                      {/* Locked state */}
                      {!level.isUnlocked && (
                        <div className="p-4 rounded-lg bg-zinc-800/20 border border-zinc-800/50">
                          <div className="flex items-center justify-center gap-2 text-zinc-500">
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
                            <span className="text-sm">
                              Earn{" "}
                              {level.requiredPoints - userProgress.totalPoints}{" "}
                              more points to unlock
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Badge earned indicator */}
                      {level.isCompleted && (
                        <div className="mt-4 flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                            <svg
                              className="w-4 h-4 text-amber-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm text-amber-400 font-medium">
                              {level.badge.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Spacer for zigzag effect */}
                  <div className={`flex-1 ${!isEven ? "max-w-[10%]" : ""}`} />
                </div>
              );
            })}
          </div>

          {/* Finish flag at the end */}
          <div className="flex justify-center mt-12">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <svg
                className="w-12 h-12"
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
              <span className="text-sm">
                Complete all levels to become a master!
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Badges Modal */}
      {showBadges && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowBadges(false)}
        >
          <div
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Badges</h2>
              <button
                onClick={() => setShowBadges(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-4 gap-3">
                {levels.map((level) => {
                  const isEarned = userProgress.earnedBadges.includes(
                    level.badge.name,
                  );
                  return (
                    <div
                      key={level.id}
                      className={`flex flex-col items-center p-3 rounded-lg transition ${
                        isEarned ? "bg-zinc-800" : "bg-zinc-800/30 opacity-40"
                      }`}
                      title={`${level.badge.name} - ${level.requiredPoints} pts`}
                    >
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-2 ${
                          isEarned ? "bg-zinc-700" : "bg-zinc-800"
                        }`}
                        style={
                          isEarned ? { color: level.badge.color } : undefined
                        }
                      >
                        {level.badge.icon}
                      </div>
                      <p className="text-xs text-center text-zinc-400 truncate w-full">
                        {level.badge.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {userProgress.earnedBadges.length} of {levels.length} badges
                  earned
                </span>
                <span className="text-blue-400 font-medium">
                  {userProgress.totalPoints} total points
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
