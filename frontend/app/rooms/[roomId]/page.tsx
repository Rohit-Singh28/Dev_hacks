"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import type { Room } from "@/lib/types";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = String(params.roomId).toUpperCase();
  const { user, hydrate, loading: authLoading } = useAuthStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const fetchRoom = useCallback(async () => {
    try {
      const { data } = await api.get(`/rooms/${roomCode}`);
      setRoom(data.room);
      setIsHost(data.isHost);
      setIsParticipant(data.isParticipant);
    } catch (err: any) {
      setError(err.response?.data?.error || "Room not found");
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!authLoading && user) fetchRoom();
  }, [authLoading, user, fetchRoom]);

  useEffect(() => {
    if (!room || room.status === "ENDED") return;
    const interval = setInterval(fetchRoom, 5000);
    return () => clearInterval(interval);
  }, [room, fetchRoom]);

  useEffect(() => {
    if (!room?.endTime || room.status !== "ACTIVE") {
      setTimeLeft("");
      return;
    }
    const tick = () => {
      const diff = new Date(room.endTime!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00:00");
        fetchRoom();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [room?.endTime, room?.status, fetchRoom]);

  async function handleStart() {
    setStarting(true);
    try {
      await api.post(`/rooms/${roomCode}/start`);
      await fetchRoom();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to start");
    } finally {
      setStarting(false);
    }
  }

  async function handleEnd() {
    setEnding(true);
    try {
      await api.post(`/rooms/${roomCode}/end`);
      await fetchRoom();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to end");
    } finally {
      setEnding(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(room!.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusBadge: Record<string, string> = {
    WAITING: "bg-amber-900/50 text-amber-400 border border-amber-800/60",
    ACTIVE: "bg-emerald-900/50 text-emerald-400 border border-emerald-800/60",
    ENDED: "bg-zinc-800/60 text-zinc-400 border border-zinc-700/60",
  };

  const diffBadge: Record<string, string> = {
    EASY: "bg-emerald-900/50 text-emerald-400 border border-emerald-800/60",
    MEDIUM: "bg-amber-900/50   text-amber-400   border border-amber-800/60",
    HARD: "bg-red-900/50     text-red-400     border border-red-800/60",
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
          <span className="font-mono text-xs text-zinc-700">Loading room…</span>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center px-6">
        <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-10 text-center max-w-sm">
          <p className="font-mono text-xs text-zinc-600 mb-3">Error</p>
          <p className="text-zinc-300 mb-5">{error}</p>
          <Link
            href="/host"
            className="font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
          >
            ← Go back
          </Link>
        </div>
      </div>
    );
  }

  if (!room) return null;

  const participantCount =
    room._count?.roomParticipants ?? room.roomParticipants?.length ?? 0;

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

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        {/* Page header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-px w-5 bg-zinc-700" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Contest Room
              </span>
            </div>
            <span
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${statusBadge[room.status] ?? "bg-zinc-800 text-zinc-400 border border-zinc-700"}`}
            >
              {room.status}
            </span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-zinc-100">
            <em
              className="not-italic text-zinc-400"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {room.title}
            </em>
          </h1>
          {room.host && (
            <p className="mt-2 font-mono text-xs text-zinc-600">
              Hosted by{" "}
              <span className="text-zinc-400">{room.host.username}</span>
            </p>
          )}
        </div>

        {/* Room code card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm p-6 mb-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-5 bg-zinc-700" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              Room Code
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-4xl font-bold tracking-[0.25em] text-zinc-100 select-all">
              {room.roomCode}
            </span>
            <button
              onClick={handleCopy}
              className="rounded-xl border border-white/[0.10] bg-transparent px-4 py-2 text-xs font-medium text-zinc-400 hover:border-white/20 hover:bg-white/[0.05] hover:text-zinc-200 transition-all"
            >
              {copied ? (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="h-3 w-3 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Copied
                </span>
              ) : (
                "Copy"
              )}
            </button>
          </div>
        </div>

        {/* Timer */}
        {room.status === "ACTIVE" && timeLeft && (
          <div className="rounded-2xl border border-emerald-800/60 bg-emerald-900/10 backdrop-blur-sm p-6 mb-5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-700 mb-2">
              Time Remaining
            </p>
            <p className="font-mono text-5xl font-light tracking-widest text-emerald-400">
              {timeLeft}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Host controls */}
        {isHost && (
          <div className="flex flex-wrap gap-3 mb-6">
            {room.status === "WAITING" && (
              <button
                onClick={handleStart}
                disabled={starting}
                className="rounded-xl border border-zinc-100 bg-zinc-100 px-6 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {starting ? (
                  <span className="inline-flex items-center gap-2">
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
                    Starting…
                  </span>
                ) : (
                  "Start Contest →"
                )}
              </button>
            )}
            {room.status === "ACTIVE" && (
              <button
                onClick={handleEnd}
                disabled={ending}
                className="rounded-xl border border-red-900/60 bg-red-950/40 px-6 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/70 hover:border-red-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {ending ? "Ending…" : "End Contest"}
              </button>
            )}
            {(room.status === "ACTIVE" || room.status === "ENDED") && (
              <Link
                href={`/rooms/${room.roomCode}/scoreboard`}
                className="rounded-xl border border-white/[0.10] bg-transparent px-6 py-2.5 text-sm font-medium text-zinc-300 hover:border-white/20 hover:bg-white/[0.05] transition-all"
              >
                Scoreboard
              </Link>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white/[0.05] mb-6" />

        {/* Two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Problems */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="h-px w-5 bg-zinc-700" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  Problems
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">
                {room.roomProblems.length} total
              </span>
            </div>

            <div className="p-3">
              {room.roomProblems.length === 0 ? (
                <p className="font-mono text-xs text-zinc-700 text-center py-8">
                  {room.status === "WAITING"
                    ? "Revealed when contest starts."
                    : "No problems."}
                </p>
              ) : (
                <div className="space-y-1">
                  {room.roomProblems.map((rp) => {
                    const canClick =
                      room.status === "ACTIVE" || room.status === "ENDED";
                    const Wrapper = canClick ? Link : "div";
                    const props = canClick
                      ? { href: `/rooms/${room.roomCode}/problems/${rp.label}` }
                      : {};
                    return (
                      <Wrapper
                        key={rp.id}
                        {...(props as any)}
                        className={`flex items-center justify-between rounded-xl px-4 py-3 border border-transparent transition-all duration-200 ${
                          canClick
                            ? "hover:bg-white/[0.04] hover:border-white/[0.08] cursor-pointer"
                            : "opacity-60 cursor-default"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-7 w-7 rounded-lg border border-white/[0.08] bg-white/[0.04] flex items-center justify-center font-mono text-xs font-bold text-zinc-300">
                            {rp.label}
                          </span>
                          <span className="text-sm text-zinc-300">
                            {rp.problem.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${diffBadge[rp.problem.difficulty] ?? ""}`}
                          >
                            {rp.problem.difficulty}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-600">
                            {rp.points}pt
                          </span>
                        </div>
                      </Wrapper>
                    );
                  })}
                </div>
              )}

              {(room.status === "ACTIVE" || room.status === "ENDED") && (
                <div className="mt-3 pt-3 border-t border-white/[0.05] px-1">
                  <Link
                    href={`/rooms/${room.roomCode}/scoreboard`}
                    className="font-mono text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    View Scoreboard →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="h-px w-5 bg-zinc-700" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  Participants
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">
                {participantCount} joined
              </span>
            </div>

            <div className="p-3">
              {!room.roomParticipants?.length ? (
                <p className="font-mono text-xs text-zinc-700 text-center py-8">
                  No participants yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {room.roomParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg border border-white/[0.08] bg-white/[0.06] flex items-center justify-center font-mono text-xs font-bold text-zinc-300">
                          {p.user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-zinc-300">
                          {p.user.username}
                        </span>
                        {p.userId === room.hostId && (
                          <span className="rounded-md bg-amber-900/50 border border-amber-800/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400">
                            Host
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-zinc-600">
                        {p.user.rating}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
