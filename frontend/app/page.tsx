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
      </div>
    </div>
  );
}
