"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

export default function JoinRoomPage() {
  const router = useRouter();
  const { user, hydrate, loading: authLoading } = useAuthStore();
  const [roomCode, setRoomCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  async function handleJoin() {
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const { data } = await api.post("/rooms/join", {
        roomCode: roomCode.toUpperCase(),
      });
      router.push(`/rooms/${data.roomCode}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to join room");
    } finally {
      setJoining(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
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

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="h-px w-5 bg-zinc-700" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Enter code
              </span>
              <span className="h-px w-5 bg-zinc-700" />
            </div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-100">
              Join a{" "}
              <em
                className="not-italic text-zinc-400"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                room
              </em>
              .
            </h1>
            <p className="mt-3 text-sm text-zinc-500">
              Enter the 6-character code shared by the host.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm px-8 py-9">
            {/* Error banner */}
            {error && (
              <p className="mb-5 rounded-xl border border-red-900/60 bg-red-950/50 px-4 py-2.5 text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="space-y-4">
              {/* Code input */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-600">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) =>
                    setRoomCode(e.target.value.toUpperCase().slice(0, 6))
                  }
                  placeholder="A3F1B2"
                  maxLength={6}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-center font-mono text-2xl font-bold text-zinc-100 tracking-[0.35em] placeholder-zinc-700 transition-colors focus:border-white/[0.18] focus:bg-white/[0.05] focus:outline-none"
                />
                {/* Character indicator dots */}
                <div className="mt-2.5 flex justify-center gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 w-4 rounded-full transition-colors duration-200 ${
                        i < roomCode.length ? "bg-zinc-300" : "bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="pt-1">
                <button
                  onClick={handleJoin}
                  disabled={joining || roomCode.length < 6}
                  className="w-full rounded-xl border border-zinc-100 bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {joining ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg
                        className="h-3.5 w-3.5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                        />
                      </svg>
                      Joining…
                    </span>
                  ) : (
                    "Join Room →"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer hint */}
          <p className="mt-5 text-center text-xs text-zinc-600">
            Want to host instead?{" "}
            <a
              href="/rooms/host"
              className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200 transition-colors"
            >
              Create a room
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
