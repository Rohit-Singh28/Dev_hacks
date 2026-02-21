"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./authStore";
import type { SubmissionUpdate } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function useSocket() {
  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    if (socket && socket.connected) {
      socketRef.current = socket;
      return;
    }

    socket = io(API_BASE, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      console.log("🔌 WebSocket connected");
    });

    socket.on("disconnect", () => {
      console.log("🔌 WebSocket disconnected");
    });

    socketRef.current = socket;

    return () => {
      // Don't disconnect on unmount — keep alive globally
    };
  }, [token]);

  return socketRef;
}

/**
 * Hook to listen for submission updates.
 */
export function useSubmissionUpdates(
  callback: (update: SubmissionUpdate) => void
) {
  const socketRef = useSocket();

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    s.on("submission-update", callback);
    return () => {
      s.off("submission-update", callback);
    };
  }, [socketRef, callback]);
}

/**
 * Join a contest room for live scoreboard.
 */
export function useContestRoom(contestId: string | null) {
  const socketRef = useSocket();

  useEffect(() => {
    if (!contestId) return;
    const s = socketRef.current;
    if (!s) return;

    s.emit("join-contest", contestId);
    return () => {
      s.emit("leave-contest", contestId);
    };
  }, [contestId, socketRef]);
}
