"use client";

/**
 * CameraFeed — Small floating camera preview shown during contests.
 *
 * Displays the user's webcam stream in a small circle in the bottom-right
 * corner. Also shows a face-detection status indicator (green = face
 * detected, red = face not detected).
 *
 * The `stream` prop is provided by ScreenMonitor via useContestMonitor.
 */

import { useEffect, useRef } from "react";

interface CameraFeedProps {
  /** The MediaStream from getUserMedia. null while pending / denied. */
  stream: MediaStream | null;
  /** Whether a face is currently detected. */
  faceDetected: boolean;
  /** Whether camera permission was denied. */
  cameraError: boolean;
}

export default function CameraFeed({
  stream,
  faceDetected,
  cameraError,
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {
      /* autoplay may fail silently */
    });
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  if (cameraError) {
    return (
      <div className="fixed bottom-4 right-4 z-30 flex h-28 w-28 items-center justify-center rounded-full border-2 border-red-700 bg-zinc-900 shadow-lg">
        <div className="text-center px-2">
          <svg
            className="mx-auto h-6 w-6 text-red-500 mb-1"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
          <p className="text-[10px] text-red-400 leading-tight">
            Camera
            <br />
            denied
          </p>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="fixed bottom-4 right-4 z-30 flex h-28 w-28 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-900 shadow-lg">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-30">
      {/* Status dot */}
      <div
        className={`absolute -top-1 -right-1 z-10 h-4 w-4 rounded-full border-2 border-zinc-950 ${
          faceDetected ? "bg-emerald-500" : "bg-red-500 animate-pulse"
        }`}
        title={faceDetected ? "Face detected" : "No face detected"}
      />

      {/* Camera circle */}
      <div
        className={`h-28 w-28 overflow-hidden rounded-full border-2 shadow-lg transition-colors ${
          faceDetected ? "border-emerald-700" : "border-red-700"
        }`}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover scale-x-[-1]"
          muted
          playsInline
          autoPlay
        />
      </div>

      {/* Label */}
      {!faceDetected && (
        <p className="mt-1 text-center text-[10px] text-red-400 font-medium">
          Face not detected
        </p>
      )}
    </div>
  );
}
