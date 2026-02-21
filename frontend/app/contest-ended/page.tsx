"use client";

/**
 * /contest-ended — Landing page after a contest is terminated due to
 * a monitoring policy violation (tab switching or clipboard abuse).
 *
 * Reads `contestId` and `reason` from URL query params to display an
 * appropriate message. The page is intentionally minimal and does NOT
 * offer any way back into the contest.
 */

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ContestEndedContent() {
  const params = useSearchParams();
  const reason = params.get("reason");

  const reasonText: Record<string, string> = {
    tab_switch:
      "You exceeded the maximum number of allowed tab/window switches during the contest. This is treated as a potential integrity violation.",
    clipboard_abuse:
      "Repeated clipboard actions (copy/paste/cut) were detected during the contest. This is treated as a potential integrity violation.",
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-6">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-900/30">
          <svg
            className="h-10 w-10 text-red-500"
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

        <h1 className="mb-3 text-2xl font-bold text-red-400">
          Contest Terminated
        </h1>

        <p className="mb-4 text-sm leading-relaxed text-zinc-400">
          {reason && reasonText[reason]
            ? reasonText[reason]
            : "Your contest session was terminated due to a policy violation."}
        </p>

        <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-left text-sm text-zinc-500">
          <p className="mb-2 font-medium text-zinc-300">What this means:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Your rating will <strong className="text-zinc-300">not</strong> be
              updated for this contest.
            </li>
            <li>
              Your submissions during this contest are preserved for admin
              review.
            </li>
            <li>
              If you believe this was a mistake, please contact the contest
              administrators.
            </li>
          </ul>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/contests"
            className="rounded-lg bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            Back to Contests
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ContestEndedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
          <p className="text-zinc-500">Loading...</p>
        </div>
      }
    >
      <ContestEndedContent />
    </Suspense>
  );
}
