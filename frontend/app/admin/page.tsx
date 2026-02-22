"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed");
                return;
            }

            sessionStorage.setItem("adminToken", data.token);
            router.push("/admin/dashboard");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0e0e0e] text-zinc-100 font-sans antialiased flex items-center justify-center">
            {/* Grain overlay */}
            <div
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: "128px",
                }}
            />

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20">
                        <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-light tracking-tight">
                        Admin <span className="text-zinc-500">Login</span>
                    </h1>
                    <p className="mt-2 text-sm text-zinc-600">
                        Restricted access — authorized personnel only.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4">
                        {error && (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="admin@gmail.com"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none transition-colors focus:border-white/[0.15] focus:bg-white/[0.06]"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none transition-colors focus:border-white/[0.15] focus:bg-white/[0.06]"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-red-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Signing in…
                            </span>
                        ) : (
                            "Sign in as Admin"
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-zinc-700">
                    This page is for AlgoNexus administrators only.
                </p>
            </div>
        </div>
    );
}
