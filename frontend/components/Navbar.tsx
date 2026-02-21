"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/authStore";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";

/* ────────────────────────────────
   Dropdown item helper
──────────────────────────────── */
function DropdownItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[15px]">
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

/* ────────────────────────────────
   Navbar
──────────────────────────────── */
export default function Navbar() {
  const { user, logout, hydrate, loading } = useAuthStore();
  const [streak, setStreak] = useState<number>(0);

  /* dropdown state */
  const [openMenu, setOpenMenu] = useState<"practice" | "compete" | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = (menu: "practice" | "compete") => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(menu);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 150);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Fetch streak
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await api.get("/users/streak");
        setStreak(data.currentStreak);
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#494848] bg-[#0e0e0e] py-1 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* ── LEFT: Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-xl font-bold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
            Code<span className="text-zinc-400">Arena</span>
          </span>
        </Link>

        {/* ── CENTER: Tabs ── */}
        <div className="flex items-center gap-1">
          {/* Practice */}
          <div
            className="relative"
            onMouseEnter={() => open("practice")}
            onMouseLeave={scheduleClose}
          >
            <button
              className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                openMenu === "practice"
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Practice
              <svg
                className={`h-3.5 w-3.5 transition-transform ${openMenu === "practice" ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {openMenu === "practice" && (
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 pt-2"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="w-56 rounded-xl border border-white/[0.08] bg-zinc-900/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
                  <DropdownItem
                    href="/problems"
                    icon={
                      <svg
                        className="h-4 w-4 text-emerald-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                    }
                    label="Browse Problems"
                  />
                  <DropdownItem
                    href="/problems/roadmap"
                    icon={
                      <svg
                        className="h-4 w-4 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    }
                    label="Roadmap"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Compete */}
          <div
            className="relative"
            onMouseEnter={() => open("compete")}
            onMouseLeave={scheduleClose}
          >
            <button
              className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                openMenu === "compete"
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Compete
              <svg
                className={`h-3.5 w-3.5 transition-transform ${openMenu === "compete" ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {openMenu === "compete" && (
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 pt-2"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="w-56 rounded-xl border border-white/[0.08] bg-zinc-900/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
                  <DropdownItem
                    href="/contests"
                    icon={
                      <svg
                        className="h-4 w-4 text-amber-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m3.044-1.35a6.726 6.726 0 01-2.748 1.35m0 0a6.772 6.772 0 01-3.044 0"
                        />
                      </svg>
                    }
                    label="Contests"
                  />
                  <DropdownItem
                    href="/duels"
                    icon={
                      <svg
                        className="h-4 w-4 text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                        />
                      </svg>
                    }
                    label="1v1 Duels"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Community */}
          <Link
            href="/duels/leaderboard"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Community
          </Link>
        </div>

        {/* ── RIGHT: Auth ── */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-white/[0.06]" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {/* Streak Badge */}
              {streak > 0 && (
                <div
                  className="flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-xs"
                  title={`${streak} day streak`}
                >
                  <svg
                    className="h-3.5 w-3.5 text-orange-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold text-orange-400">
                    {streak}
                  </span>
                </div>
              )}

              {/* Profile */}
              <Link
                href={`/profile/${user.username}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white shadow-md shadow-blue-500/20">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{user.username}</span>
                <span className="text-xs text-zinc-500">({user.rating})</span>
              </Link>

              {/* Logout */}
              <button
                onClick={logout}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-4 py-1.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:brightness-110 transition-all"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
