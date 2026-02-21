"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/authStore";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Navbar() {
  const { user, logout, hydrate, loading } = useAuthStore();
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Fetch streak for logged-in user
  useEffect(() => {
    if (!user) return;
    async function fetchStreak() {
      try {
        const { data } = await api.get("/users/streak");
        setStreak(data.currentStreak);
      } catch {
        // Ignore
      }
    }
    fetchStreak();
  }, [user]);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold text-white tracking-tight"
          >
            ⚡ CodeArena
          </Link>
          <Link
            href="/problems"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Problems
          </Link>
          <Link
            href="/contests"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Contests
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <span className="text-sm text-zinc-500">Loading...</span>
          ) : user ? (
            <>
              {/* Streak Badge */}
              {streak > 0 && (
                <div
                  className="flex items-center gap-1 text-sm"
                  title={`${streak} day streak`}
                >
                  <svg
                    className="h-4 w-4 text-orange-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-orange-400 font-medium">{streak}</span>
                </div>
              )}
              {/* Profile Link */}
              <Link
                href={`/profile/${user.username}`}
                className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                {user.username}{" "}
                <span className="text-zinc-500">({user.rating})</span>
              </Link>
              <button
                onClick={logout}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
