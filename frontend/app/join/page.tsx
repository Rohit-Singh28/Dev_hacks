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
      <div className="flex items-center justify-center h-96 text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold text-white mb-2 text-center">
        Join a Contest Room
      </h1>
      <p className="text-zinc-400 text-sm text-center mb-8">
        Enter the 6-character room code shared by the host.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <input
          type="text"
          value={roomCode}
          onChange={(e) =>
            setRoomCode(e.target.value.toUpperCase().slice(0, 6))
          }
          placeholder="e.g. A3F1B2"
          maxLength={6}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-2xl font-mono font-bold text-white tracking-[0.3em] placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />

        <button
          onClick={handleJoin}
          disabled={joining || roomCode.length < 6}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {joining ? "Joining..." : "Join Room"}
        </button>
      </div>
    </div>
  );
}
