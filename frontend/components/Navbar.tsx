"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/authStore";
import { useEffect } from "react";

export default function Navbar() {
  const { user, logout, hydrate, loading } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
          <Link
            href="/duels"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-semibold"
          >
            ⚔️ Duels
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <span className="text-sm text-zinc-500">Loading...</span>
          ) : user ? (
            <>
              <span className="text-sm text-zinc-300">
                {user.username}{" "}
                <span className="text-zinc-500">({user.rating})</span>
              </span>
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
