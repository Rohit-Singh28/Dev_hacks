"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useAuthStore } from "@/lib/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(usernameOrEmail, password);
      router.push("/problems");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/problems" });
    } catch (err: any) {
      setError("Google sign-in failed");
      setGoogleLoading(false);
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
                  Welcome back
                </span>
              </div>
              <h1 className="text-2xl font-light tracking-tight text-zinc-100">
                Sign into your{" "}
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

              {/* Username or Email */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-600">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  placeholder="username or you@example.com"
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
                  placeholder="••••••••"
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
                      Signing in…
                    </span>
                  ) : (
                    "Sign In →"
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.08]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-zinc-900/60 px-3 text-zinc-600">OR</span>
                </div>
              </div>

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 text-sm font-medium text-zinc-100 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-3"
              >
                {googleLoading ? (
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
                    Connecting…
                  </span>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Register link */}
          <p className="mt-5 text-center text-xs text-zinc-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200 transition-colors"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
