"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/authStore";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, email, password);
      router.push("/problems");
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.details?.[0]?.message ||
          "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  };

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

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Logo / wordmark */}
          <div className="mb-10 text-center">
            <Link href="/" className="inline-block">
              <span className="font-mono text-lg font-bold tracking-tight">
                CODE<span className="text-zinc-500">ARENA</span>
              </span>
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm px-8 py-9">
            {/* Heading */}
            <div className="mb-7">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-px w-5 bg-zinc-700" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  New account
                </span>
              </div>
              <h1 className="text-2xl font-light tracking-tight text-zinc-100">
                Create your{" "}
                <em
                  className="not-italic text-zinc-400"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  account
                </em>
                .
              </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error banner */}
              {error && (
                <p className="rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-2.5 text-xs text-red-400">
                  {error}
                </p>
              )}

              {/* Username */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-600">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="e.g. coderx42"
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 transition-colors focus:border-white/[0.18] focus:bg-white/[0.05] focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-600">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 transition-colors focus:border-white/[0.18] focus:bg-white/[0.05] focus:outline-none"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-600">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 transition-colors focus:border-white/[0.18] focus:bg-white/[0.05] focus:outline-none"
                />
              </div>

              {/* Submit */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl border border-zinc-100 bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg
                        className="h-3.5 w-3.5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                        />
                      </svg>
                      Creating…
                    </span>
                  ) : (
                    "Create Account →"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sign-in link */}
          <p className="mt-5 text-center text-xs text-zinc-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
