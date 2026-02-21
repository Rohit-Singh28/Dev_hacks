import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white mb-4">
          CodeArena
        </h1>
        <p className="text-xl text-zinc-400 mb-8">
          Competitive programming platform with real-time contests,
          multi-language support, and instant judging.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/problems"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Browse Problems
          </Link>
          <Link
            href="/contests"
            className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            View Contests
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 text-left">
          <div className="rounded-lg border border-zinc-800 p-5">
            <h3 className="font-semibold text-white mb-2">Multi-Language</h3>
            <p className="text-sm text-zinc-400">
              C++, Python, Java - code in the language you prefer.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 p-5">
            <h3 className="font-semibold text-white mb-2">Live Contests</h3>
            <p className="text-sm text-zinc-400">
              Real-time scoreboard, synchronized timers, fair judging.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 p-5">
            <h3 className="font-semibold text-white mb-2">Instant Judging</h3>
            <p className="text-sm text-zinc-400">
              Submit code and get verdicts via WebSocket push.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-8 text-left">
          <div className="rounded-lg border border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="h-5 w-5 text-orange-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="font-semibold text-white">Daily Streaks</h3>
            </div>
            <p className="text-sm text-zinc-400">
              Track your consistency with daily streak counters and activity
              heatmaps.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="h-5 w-5 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <h3 className="font-semibold text-white">Bookmarks</h3>
            </div>
            <p className="text-sm text-zinc-400">
              Save problems for later with bookmarks. Filter and revisit
              anytime.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <h3 className="font-semibold text-white">Hints</h3>
            </div>
            <p className="text-sm text-zinc-400">
              Stuck on a problem? Reveal progressive hints to guide your
              thinking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
