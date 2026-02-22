"use client";

import React, { useMemo } from "react";

/* ─── Public API ──────────────────────────────────────────────────────────── */

export interface LevelPathProps {
  /** Total number of levels */
  levels: number;
  /** How many levels the user has completed (0 … levels) */
  completedLevel: number;
  /** Fires when a node is clicked — receives the 1‑based level number */
  onNodeClick?: (level: number) => void;
}

/* ─── Layout tokens ───────────────────────────────────────────────────────── */

const PAD_Y = 52;
const STEP = 92;
const R = 14;
const W = 140;
const AMP = 30;
const CX = W / 2;

/* ─── Geometry helpers ────────────────────────────────────────────────────── */

function xy(i: number): { x: number; y: number } {
  return {
    x: CX + (i % 2 === 0 ? AMP : -AMP),
    y: PAD_Y + i * STEP,
  };
}

function buildCurve(n: number): string {
  if (n < 1) return "";
  const d: string[] = [];
  for (let i = 0; i < n; i++) {
    const { x, y } = xy(i);
    if (i === 0) {
      d.push(`M${x},${y}`);
      continue;
    }
    const p = xy(i - 1);
    const my = (p.y + y) / 2;
    d.push(`C${p.x},${my} ${x},${my} ${x},${y}`);
  }
  return d.join(" ");
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function LevelPath({
  levels,
  completedLevel,
  onNodeClick,
}: LevelPathProps) {
  const H = PAD_Y * 2 + Math.max(0, levels - 1) * STEP;
  const full = useMemo(() => buildCurve(levels), [levels]);
  const done = useMemo(
    () => buildCurve(Math.min(completedLevel + 1, levels)),
    [completedLevel, levels],
  );

  /* current = first uncompleted */
  const current = completedLevel < levels ? completedLevel + 1 : -1;

  return (
    <div className="w-full select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Level progression — ${completedLevel} of ${levels} completed`}
      >
        {/* ── Filters & gradients ── */}
        <defs>
          {/* soft bloom for completed path */}
          <filter id="lp-bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* stronger bloom for active ring */}
          <filter id="lp-pulse" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* dim gradient for base path */}
          <linearGradient id="lp-dim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#27272a" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#18181b" stopOpacity="0.3" />
          </linearGradient>

          {/* completed path glow gradient */}
          <linearGradient id="lp-lit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e4e4e7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a1a1aa" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* ── Base dim path ── */}
        <path
          d={full}
          fill="none"
          stroke="url(#lp-dim)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* ── Completed : outer bloom ── */}
        {completedLevel > 0 && (
          <path
            d={done}
            fill="none"
            stroke="#d4d4d8"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.06"
            filter="url(#lp-bloom)"
          />
        )}

        {/* ── Completed : crisp stroke ── */}
        {completedLevel > 0 && (
          <path
            d={done}
            fill="none"
            stroke="url(#lp-lit)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}

        {/* ── Level nodes ── */}
        {Array.from({ length: levels }, (_, i) => {
          const n = i + 1;
          const { x, y } = xy(i);
          const isCompleted = n <= completedLevel;
          const isCurrent = n === current;
          const isFuture = n > completedLevel + 1;
          const side = i % 2 === 0 ? 1 : -1;

          return (
            <g
              key={n}
              className={onNodeClick ? "cursor-pointer" : ""}
              onClick={() => onNodeClick?.(n)}
              style={{ outline: "none" }}
            >
              {/* ─ Active pulsing ring ─ */}
              {isCurrent && (
                <>
                  <circle
                    cx={x}
                    cy={y}
                    r={R + 6}
                    fill="none"
                    stroke="#d4d4d8"
                    strokeWidth="0.8"
                    opacity="0"
                    filter="url(#lp-pulse)"
                  >
                    <animate
                      attributeName="r"
                      values={`${R + 3};${R + 14};${R + 3}`}
                      dur="3s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.3;0;0.3"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle
                    cx={x}
                    cy={y}
                    r={R + 3}
                    fill="none"
                    stroke="#a1a1aa"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                </>
              )}

              {/* ─ Soft halo behind completed nodes ─ */}
              {isCompleted && (
                <circle
                  cx={x}
                  cy={y}
                  r={R + 4}
                  fill="#d4d4d8"
                  opacity="0.03"
                  filter="url(#lp-bloom)"
                />
              )}

              {/* ─ Outer circle ─ */}
              <circle
                cx={x}
                cy={y}
                r={R}
                fill={isCompleted || isCurrent ? "#141414" : "#0a0a0a"}
                stroke={
                  isCompleted
                    ? "#a1a1aa"
                    : isCurrent
                      ? "#71717a"
                      : isFuture
                        ? "#1f1f23"
                        : "#3f3f46"
                }
                strokeWidth={isCompleted || isCurrent ? "1.5" : "1"}
                className="transition-all duration-300"
              />

              {/* ─ Inner icon ─ */}
              {isCompleted ? (
                // Glowing filled circle
                <>
                  <circle
                    cx={x}
                    cy={y}
                    r={R - 3}
                    fill="#a1a1aa"
                    opacity="0.7"
                    filter="url(#lp-bloom)"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={R - 6}
                    fill="#fafaf9"
                    opacity="0.9"
                  />
                </>
              ) : isCurrent ? (
                /* breathing dot */
                <circle cx={x} cy={y} r={3.5} fill="#a1a1aa">
                  <animate
                    attributeName="opacity"
                    values="1;0.35;1"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </circle>
              ) : isFuture ? (
                /* padlock */
                <>
                  <rect
                    x={x - 3.5}
                    y={y - 0.5}
                    width={7}
                    height={5}
                    rx={1}
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="0.8"
                  />
                  <path
                    d={`M${x - 2},${y - 0.5} v-2.5 a2,2 0 0,1 4,0 v2.5`}
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                /* unlocked but not current */
                <circle cx={x} cy={y} r={2.5} fill="#52525b" />
              )}

              {/* ─ Level number ─ */}
              <text
                x={x + side * (R + 9)}
                y={y + 3.5}
                textAnchor={side === 1 ? "start" : "end"}
                fill={
                  isCompleted ? "#71717a" : isCurrent ? "#a1a1aa" : "#27272a"
                }
                fontSize="9"
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                className="transition-[fill] duration-300"
              >
                {String(n).padStart(2, "0")}
              </text>
            </g>
          );
        })}

        {/* ── Finish marker ── */}
        {levels > 0 &&
          (() => {
            const last = xy(levels - 1);
            const fy = last.y + STEP * 0.55;
            return (
              <g opacity={completedLevel >= levels ? "0.7" : "0.25"}>
                <line
                  x1={CX}
                  y1={fy - 10}
                  x2={CX}
                  y2={fy + 4}
                  stroke={completedLevel >= levels ? "#a1a1aa" : "#27272a"}
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d={`M${CX},${fy - 10} l8,-6 v6 l-8,6 v-6 z`}
                  fill="none"
                  stroke={completedLevel >= levels ? "#a1a1aa" : "#27272a"}
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
                {completedLevel >= levels && (
                  <circle
                    cx={CX}
                    cy={fy - 3}
                    r={10}
                    fill="#d4d4d8"
                    opacity="0.04"
                    filter="url(#lp-bloom)"
                  />
                )}
              </g>
            );
          })()}
      </svg>

      {/* ── Legend ── */}
      <div className="mt-4 flex items-center justify-center gap-4">
        {[
          { color: "bg-zinc-400", label: "Done" },
          { color: "bg-zinc-500 animate-pulse", label: "Current" },
          { color: "bg-zinc-800", label: "Locked" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
            <span className="font-mono text-[9px] text-zinc-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
