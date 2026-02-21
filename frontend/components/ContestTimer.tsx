"use client";

import { useEffect, useState } from "react";

interface ContestTimerProps {
  startTime: string;
  endTime: string;
  status: "UPCOMING" | "ACTIVE" | "ENDED";
}

export default function ContestTimer({
  startTime,
  endTime,
  status,
}: ContestTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  const formatDuration = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (status === "ENDED" || now >= end) {
    return (
      <div className="text-center">
        <p className="text-sm text-zinc-500">Contest Ended</p>
      </div>
    );
  }

  if (status === "UPCOMING" || now < start) {
    const remaining = start - now;
    return (
      <div className="text-center">
        <p className="text-sm text-zinc-500">Starts in</p>
        <p className="text-2xl font-mono font-bold text-blue-400">
          {formatDuration(remaining)}
        </p>
      </div>
    );
  }

  // ACTIVE
  const remaining = end - now;
  return (
    <div className="text-center">
      <p className="text-sm text-zinc-500">Time Remaining</p>
      <p
        className={`text-2xl font-mono font-bold ${
          remaining < 300000 ? "text-red-400" : "text-green-400"
        }`}
      >
        {formatDuration(remaining)}
      </p>
    </div>
  );
}
