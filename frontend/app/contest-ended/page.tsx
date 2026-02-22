"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ContestEndedContent() {
  const params = useSearchParams();
  const reason = params.get("reason");

  const reasonText: Record<string, { title: string; desc: string }> = {
    tab_switch: {
      title: "Tab Switch Detected",
      desc: "You exceeded the maximum number of allowed tab/window switches during the contest. This is treated as a potential integrity violation.",
    },
    clipboard_abuse: {
      title: "Clipboard Abuse Detected",
      desc: "Repeated clipboard actions (copy/paste/cut) were detected during the contest. This is treated as a potential integrity violation.",
    },
    screen_away: {
      title: "Presence Not Detected",
      desc: "You were not detected in front of the screen too many times during the contest. This is treated as a potential integrity violation.",
    },
    fullscreen_exit: {
      title: "Fullscreen Exited",
      desc: "You exited fullscreen mode too many times during the contest. Participants must remain in fullscreen throughout. This is treated as a potential integrity violation.",
    },
    screen_capture: {
      title: "Screen Capture Detected",
      desc: "Screen recording or screen sharing was detected during the contest. This is strictly prohibited and treated as a serious integrity violation.",
    },
  };

  const matched = reason ? reasonText[reason] : null;

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

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg text-center">
          {/* Icon */}
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-red-900/60 bg-red-950/40">
            <svg
              className="h-9 w-9 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>

          {/* Header */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="h-px w-5 bg-red-900/60" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-800">
                Integrity violation
              </span>
              <span className="h-px w-5 bg-red-900/60" />
            </div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-100">
              Contest{" "}
              <em
                className="not-italic text-red-400"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                terminated
              </em>
              .
            </h1>
          </div>

          {/* Reason */}
          <p className="mb-6 text-sm leading-relaxed text-zinc-500 max-w-md mx-auto">
            {matched?.desc ??
              "Your contest session was terminated due to a policy violation."}
          </p>

          {/* Info card */}
          <div className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm px-6 py-5 text-left">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5 bg-zinc-700" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                What this means
              </span>
            </div>
            <div className="space-y-3">
              {[
                <>
                  Your rating will{" "}
                  <span className="text-zinc-200 font-medium">not</span> be
                  updated for this contest.
                </>,
                <>
                  Your submissions during this contest are preserved for admin
                  review.
                </>,
                <>
                  If you believe this was a mistake, please contact the contest
                  administrators.
                </>,
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 font-mono text-[10px] text-zinc-600 flex-shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.05] mb-6" />

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <Link
              href="/contests"
              className="rounded-xl border border-zinc-100 bg-zinc-100 px-6 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10"
            >
              Back to Contests
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-white/[0.10] bg-transparent px-6 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.05]"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContestEndedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
        </div>
      }
    >
      <ContestEndedContent />
    </Suspense>
  );
}
