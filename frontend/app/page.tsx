"use client";

import Link from "next/link";
import { useState } from "react";
/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Problem {
  id: string;
  title: string;
  acceptance: string;
  difficulty: "Easy" | "Medium" | "Hard";
  solved?: boolean;
}

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */
const problems: Problem[] = [
  {
    id: "001",
    title: "Two Sum",
    acceptance: "63.4%",
    difficulty: "Easy",
    solved: true,
  },
  {
    id: "053",
    title: "Maximum Subarray",
    acceptance: "49.8%",
    difficulty: "Medium",
    solved: true,
  },
  {
    id: "084",
    title: "Largest Rectangle in Histogram",
    acceptance: "41.2%",
    difficulty: "Hard",
  },
  {
    id: "124",
    title: "Binary Tree Max Path Sum",
    acceptance: "38.7%",
    difficulty: "Hard",
  },
  {
    id: "295",
    title: "Find Median from Data Stream",
    acceptance: "50.3%",
    difficulty: "Hard",
  },
];

const stats = [
  { value: "12.4k", label: "Problems" },
  { value: "98k", label: "Developers" },
  { value: "450+", label: "Contests run" },
];

const features = [
  {
    tag: "Problems",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        />
      </svg>
    ),
    title: "AI-Powered Problem Solving",
    desc: "Every problem ships with an integrated AI chatbot that gives Socratic hints — never spoilers. Stuck? The AI code reviewer analyses your submission line-by-line, explains time complexity, and suggests targeted improvements.",
    pills: ["AI Chatbot", "Code Review", "Complexity Analysis"],
  },
  {
    tag: "Contests",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
    title: "Strict Proctored Contests",
    desc: "Our AI proctoring engine runs silently in the background. It flags tab switches and window-blur events, detects pasted code blocks, and uses your webcam to alert when your face leaves the frame — ensuring every result is earned.",
    pills: ["Tab Detection", "Paste Guard", "Face Monitoring"],
  },
  {
    tag: "Duels",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
    title: "1v1 Code Duels",
    desc: "Challenge any user to a head-to-head duel. Pick a shared problem, agree on a time limit from 5 minutes to 2 hours, and race to the correct solution. First to pass all test cases wins the match and the rating points.",
    pills: ["Head-to-Head", "Custom Timer", "Live Results"],
  },
  {
    tag: "Roadmap",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
        />
      </svg>
    ),
    title: "Structured Learning Roadmap",
    desc: "Follow curated topic-by-topic roadmaps — Arrays, Trees, Graphs, DP and beyond. Each node shows your mastery percentage and unlocks the next tier. Progress is tracked across sessions so you always know what to study next.",
    pills: ["Topic Maps", "Progress Tracking", "Mastery Tiers"],
  },
];

const testimonials = [
  {
    initials: "AK",
    color: "bg-violet-600",
    name: "Aryan Kapoor",
    role: "SWE @ Google",
    quote:
      "The AI code reviewer is genuinely scary good. It caught an off-by-one error in my segment tree that I'd been staring at for 45 minutes — and explained exactly why it was wrong in plain English.",
    feature: "AI Code Reviewer",
  },
  {
    initials: "SM",
    color: "bg-sky-600",
    name: "Sofia Müller",
    role: "CS Student, TU Berlin",
    quote:
      "I used to cheat-proof contests by hoping nobody cheated. The proctoring here actually works — tab-switch warnings went off twice on teammates during practice and they cleaned up their habits.",
    feature: "Proctored Contests",
  },
  {
    initials: "RT",
    color: "bg-amber-600",
    name: "Rahul Tiwari",
    role: "Competitive Programmer, Div1",
    quote:
      "1v1 duels are addictive. Set a 15-minute timer, pick a medium problem, and suddenly every second counts. It's the closest thing to a real interview under pressure I've found on any other coding platform.",
    feature: "1v1 Code Duels",
  },
  {
    initials: "LC",
    color: "bg-emerald-600",
    name: "Lin Chen",
    role: "Backend Engineer @ Stripe",
    quote:
      "The roadmap told me I was strong on arrays but weak on graph theory — which matched exactly what tripped me up in my last interview loop. Two months of focused practice later, I had the offer.",
    feature: "Learning Roadmap",
  },
  {
    initials: "SA",
    color: "bg-violet-600",
    name: "Shardul Aher",
    role: "SWE @ LeetCode",
    quote:
      "The AI code reviewer is genuinely scary good. It caught an off-by-one error in my segment tree that I'd been staring at for 45 minutes — and explained exactly why it was wrong in plain English.",
    feature: "AI Code Reviewer",
  },
  {
    initials: "PO",
    color: "bg-rose-600",
    name: "Priya Oberoi",
    role: "Freelance Developer",
    quote:
      "The AI chatbot gives hints without giving away the answer, which is rare. Every other tool either does nothing or just pastes the solution. This one actually teaches you to think.",
    feature: "AI Chatbot",
  },
];

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
function DifficultyBadge({
  difficulty,
}: {
  difficulty: Problem["difficulty"];
}) {
  const map = {
    Easy: "bg-emerald-900/60 text-emerald-400 border border-emerald-700/50",
    Medium: "bg-amber-900/60   text-amber-400   border border-amber-700/50",
    Hard: "bg-red-900/60     text-red-400     border border-red-700/50",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ${map[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

function ProblemRow({ problem }: { problem: Problem }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 hover:bg-white/[0.06] transition-colors cursor-pointer">
      <span className="w-8 shrink-0 font-mono text-xs text-zinc-600">
        {problem.id}
      </span>
      <span className="flex-1 text-sm font-medium text-zinc-200">
        {problem.title}
      </span>
      <span className="text-xs text-zinc-500 mr-2">{problem.acceptance}</span>
      <DifficultyBadge difficulty={problem.difficulty} />
      {problem.solved && (
        <span className="ml-1 text-emerald-400 text-sm">✓</span>
      )}
    </div>
  );
}

function ProblemsPanel() {
  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-zinc-900/80 backdrop-blur-xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <span className="font-semibold text-zinc-100 text-[15px]">
          Today's Problems
        </span>
        <span className="rounded-full bg-emerald-900/70 border border-emerald-700/50 px-3 py-0.5 text-[11px] font-semibold text-emerald-400">
          3 solved
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {problems.map((p) => (
          <ProblemRow key={p.id} problem={p} />
        ))}
      </div>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-3xl font-bold text-zinc-100 tracking-tight">
        {value}
      </span>
      <span className="mt-0.5 text-xs text-zinc-500 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

function FeatureCard({ feature }: { feature: (typeof features)[0] }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          {feature.tag}
        </span>
        <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
          {feature.icon}
        </span>
      </div>
      <h3 className="text-base font-semibold text-zinc-100 leading-snug mb-3">
        {feature.title}
      </h3>
      <p className="text-sm leading-relaxed text-zinc-500 flex-1">
        {feature.desc}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {feature.pills.map((pill) => (
          <span
            key={pill}
            className="rounded-full bg-white/[0.04] border border-white/[0.07] px-2.5 py-0.5 text-[11px] text-zinc-500"
          >
            {pill}
          </span>
        ))}
      </div>
    </div>
  );
}

function TestimonialCard({ t }: { t: (typeof testimonials)[0] }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/[0.11] transition-all duration-300">
      {/* Opening quote */}
      <span
        className="text-4xl leading-none mb-3 select-none text-zinc-700"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        "
      </span>
      <p className="text-sm leading-relaxed text-zinc-400 flex-1">{t.quote}</p>
      {/* Feature tag */}
      <span className="mt-5 inline-flex self-start items-center rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        {t.feature}
      </span>
      {/* Author */}
      <div className="mt-5 flex items-center gap-3 border-t border-white/[0.05] pt-5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${t.color}`}
        >
          {t.initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-200">{t.name}</p>
          <p className="text-xs text-zinc-600">{t.role}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-zinc-100 font-sans antialiased overflow-x-hidden">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      <div className="relative z-10">
        {/* ════════════════════════════════════════
            HERO
        ════════════════════════════════════════ */}
        <section className="mx-auto  px-8 pt-20 pb-16 lg:px-28">
          <div className="mb-8 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Competitive Programming Platform
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h1 className="text-[clamp(3rem,8vw,5.5rem)] font-light leading-[1.0] tracking-tight text-zinc-100">
                Think clearly.
                <br />
                Code{" "}
                <em
                  className="not-italic text-zinc-400"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  precisely
                </em>
                .<br />
                Compete well.
              </h1>

              <p className="mt-7 max-w-sm text-[15px] leading-relaxed text-zinc-500">
                A focused environment for algorithmic problem solving. No
                distractions, no dark patterns — just you, your editor, and the
                problem.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  href="/problems"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10"
                >
                  Browse Problems <span className="text-base">→</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-xl border border-white/[0.10] bg-transparent px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Login
                </Link>
              </div>

              <div className="mt-14 flex items-center gap-10 ">
                {stats.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-10">
                    <StatItem value={s.value} label={s.label} />
                    {i < stats.length - 1 && (
                      <div className="h-8 w-px bg-white/[0.08]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:pb-16">
              <ProblemsPanel />
            </div>
          </div>
        </section>

        <div className="border-t border-white/[0.05]" />

        {/* ════════════════════════════════════════
            FEATURES
        ════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-8 py-20 lg:px-16">
          <div className="mb-12">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-6 bg-zinc-700" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">
                Platform Features
              </span>
            </div>
            <h2 className="text-3xl font-light tracking-tight text-zinc-100 sm:text-4xl">
              Everything you need to{" "}
              <em
                className="not-italic text-zinc-400"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                grow
              </em>
              .
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-500">
              From guided learning to high-stakes competition, every layer of
              the platform is built around one idea — helping you write better
              code, faster.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>
        </section>

        <div className="border-t border-white/[0.05]" />

        {/* ════════════════════════════════════════
            TESTIMONIALS
        ════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-8 py-20 lg:px-16">
          <div className="mb-12">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-6 bg-zinc-700" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">
                Trusted By Developers
              </span>
            </div>
            <h2 className="text-3xl font-light tracking-tight text-zinc-100 sm:text-4xl">
              Hear it from the{" "}
              <em
                className="not-italic text-zinc-400"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                community
              </em>
              .
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-500">
              Real feedback from developers who solved their first hard problem,
              won their first duel, or landed an offer after following the
              roadmap.
            </p>
          </div>

          {/* Masonry grid — CSS columns for natural card heights */}
          <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
            {testimonials.map((t) => (
              <div key={t.name} className="break-inside-avoid">
                <TestimonialCard t={t} />
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-white/[0.05]" />

        {/* ════════════════════════════════════════
            CTA BANNER
        ════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-8 py-16 lg:px-16">
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm px-10 py-14 text-center">
            <h2 className="text-3xl font-light text-zinc-100 tracking-tight">
              Ready to compete?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
              Join 98,000+ developers on CodeArena. Your next rating
              breakthrough is one arena away.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-6 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white transition-colors"
              >
                Create free account →
              </Link>
              <Link
                href="/problems"
                className="inline-flex items-center rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-zinc-400 hover:border-white/20 hover:text-zinc-200 transition-colors"
              >
                Explore problems
              </Link>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════ */}
        <footer className="border-t border-white/[0.05]">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-8 py-8 sm:flex-row lg:px-16">
            <span className="font-mono text-sm font-bold tracking-tight text-zinc-100">
              CODE<span className="text-zinc-500">ARENA</span>
            </span>
            <div className="flex flex-wrap items-center gap-6">
              {["Problems", "Contests", "Leaderboard", "Blog", "GitHub"].map(
                (l) => (
                  <Link
                    key={l}
                    href={`/${l.toLowerCase()}`}
                    className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    {l}
                  </Link>
                ),
              )}
            </div>
            <p className="text-xs text-zinc-700">
              © {new Date().getFullYear()} CODEARENA
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
