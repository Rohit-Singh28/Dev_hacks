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

  // Poll for updates every 5s
  useEffect(() => {
    if (!room || room.status === "ENDED") return;
    const interval = setInterval(fetchRoom, 5000);
    return () => clearInterval(interval);
  }, [room, fetchRoom]);

  // Countdown timer
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

  const statusColors: Record<string, string> = {
    WAITING: "text-yellow-400 bg-yellow-950 border-yellow-700",
    ACTIVE: "text-green-400 bg-green-950 border-green-800",
    ENDED: "text-zinc-400 bg-zinc-900 border-zinc-700",
  };

  const diffColors: Record<string, string> = {
    EASY: "text-green-400",
    MEDIUM: "text-yellow-400",
    HARD: "text-red-400",
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-500">
        Loading room...
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-lg border border-red-800 bg-red-950 p-6 text-center">
          <p className="text-red-400 text-lg">{error}</p>
          <Link
            href="/host"
            className="text-blue-400 hover:underline mt-2 inline-block"
          >
            Go back
          </Link>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">{room.title}</h1>
        <span
          className={`text-xs font-medium rounded px-2 py-0.5 border ${
            statusColors[room.status]
          }`}
        >
          {room.status}
        </span>
      </div>

      {/* Room Code */}
      <div className="flex items-center gap-4 mb-6">
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2">
          <span className="text-zinc-400 text-sm mr-2">Room Code:</span>
          <span className="text-2xl font-mono font-bold text-blue-400 tracking-widest">
            {room.roomCode}
          </span>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(room.roomCode)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
        >
          Copy
        </button>
        {room.host && (
          <span className="text-sm text-zinc-400">
            Hosted by{" "}
            <span className="text-white font-medium">{room.host.username}</span>
          </span>
        )}
      </div>

      {/* Timer for active rooms */}
      {room.status === "ACTIVE" && timeLeft && (
        <div className="mb-6 rounded-lg border border-green-800 bg-green-950/30 p-4 text-center">
          <p className="text-sm text-green-400 mb-1">Time Remaining</p>
          <p className="text-3xl font-mono font-bold text-green-300">
            {timeLeft}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Host Controls */}
      {isHost && (
        <div className="mb-6 flex gap-3">
          {room.status === "WAITING" && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              {starting ? "Starting..." : "Start Contest"}
            </button>
          )}
          {room.status === "ACTIVE" && (
            <button
              onClick={handleEnd}
              disabled={ending}
              className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              {ending ? "Ending..." : "End Contest"}
            </button>
          )}
          {room.status === "ACTIVE" && (
            <Link
              href={`/rooms/${room.roomCode}/scoreboard`}
              className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
            >
              Scoreboard
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Problems */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            Problems ({room.roomProblems.length})
          </h2>
          {room.roomProblems.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              {room.status === "WAITING"
                ? "Problems will be revealed when the contest starts."
                : "No problems available."}
            </p>
          ) : (
            <div className="space-y-2">
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
                    className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3 hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-blue-400">
                        {rp.label}
                      </span>
                      <span className="text-white font-medium">
                        {rp.problem.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium ${
                          diffColors[rp.problem.difficulty]
                        }`}
                      >
                        {rp.problem.difficulty}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {rp.points} pts
                      </span>
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          )}

          {(room.status === "ACTIVE" || room.status === "ENDED") && (
            <Link
              href={`/rooms/${room.roomCode}/scoreboard`}
              className="mt-4 inline-block text-sm text-blue-400 hover:underline"
            >
              View Scoreboard →
            </Link>
          )}
        </div>

        {/* Participants */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            Participants (
            {room._count?.roomParticipants ??
              room.roomParticipants?.length ??
              0}
            )
          </h2>
          <div className="space-y-2">
            {room.roomParticipants?.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    {p.user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm">{p.user.username}</span>
                  {p.userId === room.hostId && (
                    <span className="text-[10px] rounded bg-yellow-900 text-yellow-400 px-1.5 py-0.5 font-medium">
                      HOST
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">{p.user.rating}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
