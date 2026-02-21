"use client";

/**
 * ContestEntryGate — Pre-entry permission gate shown before the contest
 * problem dashboard is accessible.
 *
 * Checks:
 *   1. Camera permission (required for face monitoring).
 *   2. Confirms user understanding of contest rules (fullscreen, no recording).
 *
 * Only when all permissions are granted and the user confirms does it render
 * the actual contest content (children).
 *
 * Usage:
 *   <ContestEntryGate contestId={id}>
 *     <ActualProblemContent />
 *   </ContestEntryGate>
 */

import { useState, useCallback, type ReactNode } from "react";

interface ContestEntryGateProps {
  /** The contest or room ID (used for display and localStorage key). */
  contestId: string | null;
  /** The contest content to render once permissions are granted. */
  children: ReactNode;
}

type CameraStatus = "pending" | "granted" | "denied";

export default function ContestEntryGate({
  contestId,
  children,
}: ContestEntryGateProps) {
  const storageKey = contestId ? `contest_gate_passed_${contestId}` : null;

  // Check if the user already passed the gate (e.g. navigated back and forth).
  const alreadyPassed =
    storageKey && typeof window !== "undefined"
      ? localStorage.getItem(storageKey) === "true"
      : false;

  const [gatePassed, setGatePassed] = useState(alreadyPassed);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("pending");
  const [requesting, setRequesting] = useState(false);

  const requestCamera = useCallback(async () => {
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      // Stop the stream immediately — the actual ScreenMonitor will re-request.
      stream.getTracks().forEach((t) => t.stop());
      setCameraStatus("granted");
    } catch {
      setCameraStatus("denied");
    } finally {
      setRequesting(false);
    }
  }, []);

  const handleEnterContest = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
    setGatePassed(true);
  }, [storageKey]);

  // If no contestId yet (still loading) or gate already passed, render children.
  if (!contestId || gatePassed) {
    return <>{children}</>;
  }

  const cameraReady = cameraStatus === "granted";

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-900/30">
            <svg
              className="h-8 w-8 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Contest Environment Setup
          </h1>
          <p className="text-sm text-zinc-400">
            Before entering the contest, please grant the required permissions
            and review the rules below.
          </p>
        </div>

        {/* Permissions checklist */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 mb-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">
            Required Permissions
          </h2>

          {/* Camera permission */}
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  cameraReady
                    ? "bg-emerald-900/40"
                    : cameraStatus === "denied"
                      ? "bg-red-900/40"
                      : "bg-zinc-800"
                }`}
              >
                {cameraReady ? (
                  <svg
                    className="h-4 w-4 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                ) : cameraStatus === "denied" ? (
                  <svg
                    className="h-4 w-4 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4 text-zinc-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm text-white font-medium">Camera Access</p>
                <p className="text-xs text-zinc-500">
                  Required for face monitoring during the contest
                </p>
              </div>
            </div>
            {cameraStatus === "pending" && (
              <button
                onClick={requestCamera}
                disabled={requesting}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {requesting ? "Requesting…" : "Grant Access"}
              </button>
            )}
            {cameraReady && (
              <span className="text-xs text-emerald-400 font-medium">
                Granted
              </span>
            )}
            {cameraStatus === "denied" && (
              <div className="text-right">
                <span className="text-xs text-red-400 font-medium block">
                  Denied
                </span>
                <button
                  onClick={requestCamera}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 underline mt-0.5"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Fullscreen notice */}
          <div className="flex items-center gap-3 py-3 border-b border-zinc-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
              <svg
                className="h-4 w-4 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-white font-medium">Fullscreen Mode</p>
              <p className="text-xs text-zinc-500">
                Entering fullscreen automatically after entering
              </p>
            </div>
          </div>

          {/* Screen recording notice */}
          <div className="flex items-center gap-3 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
              <svg
                className="h-4 w-4 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-white font-medium">
                No Screen Recording / Sharing
              </p>
              <p className="text-xs text-zinc-500">
                Screen capture is blocked and will appear black
              </p>
            </div>
          </div>
        </div>

        {/* Contest rules */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 mb-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Contest Rules
          </h2>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">&#9679;</span>
              You must remain in{" "}
              <strong className="text-zinc-300">fullscreen mode</strong>{" "}
              throughout the contest. Exiting fullscreen will count as a
              warning.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">&#9679;</span>
              <strong className="text-zinc-300">
                Screen recording and screen sharing
              </strong>{" "}
              are strictly prohibited and will be detected.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">&#9679;</span>
              <strong className="text-zinc-300">Tab switching</strong> and{" "}
              <strong className="text-zinc-300">window switching</strong> will
              be monitored. Excessive switches will end your contest.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">&#9679;</span>
              Your{" "}
              <strong className="text-zinc-300">face must be visible</strong> to
              the camera at all times during the contest.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-red-500">&#9679;</span>
              After <strong className="text-zinc-300">3 warnings</strong> for
              any violation, your contest will be{" "}
              <strong className="text-red-400">automatically terminated</strong>
              .
            </li>
          </ul>
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnterContest}
          disabled={!cameraReady}
          className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${
            cameraReady
              ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
        >
          {cameraReady
            ? "Enter Contest Environment"
            : "Grant Camera Permission to Continue"}
        </button>

        {cameraStatus === "denied" && (
          <p className="mt-3 text-center text-xs text-red-400">
            Camera access is required. Please allow camera access in your
            browser settings and retry.
          </p>
        )}
      </div>
    </div>
  );
}
