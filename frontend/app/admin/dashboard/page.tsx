"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ProblemOption {
  id: string;
  title: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

interface ContestProblem {
  id: string;
  label: string;
  points: number;
  orderIdx: number;
  problem: ProblemOption;
}

interface AdminContest {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  status: "UPCOMING" | "ACTIVE" | "ENDED";
  contestProblems: ContestProblem[];
  _count?: { contestParticipants: number };
}

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("adminToken");
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

function DiffBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    EASY: "bg-emerald-900/60 text-emerald-400 border-emerald-700/50",
    MEDIUM: "bg-amber-900/60 text-amber-400 border-amber-700/50",
    HARD: "bg-red-900/60 text-red-400 border-red-700/50",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold border ${map[d] || map.MEDIUM}`}
    >
      {d}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    UPCOMING: {
      cls: "bg-sky-900/40 text-sky-400 border-sky-800/50",
      label: "Upcoming",
    },
    ACTIVE: {
      cls: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50",
      label: "Active",
    },
    ENDED: {
      cls: "bg-white/[0.04] text-zinc-500 border-white/[0.07]",
      label: "Ended",
    },
  };
  const c = cfg[status] || cfg.ENDED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${c.cls}`}
    >
      {status === "ACTIVE" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {c.label}
    </span>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [contests, setContests] = useState<AdminContest[]>([]);
  const [allProblems, setAllProblems] = useState<ProblemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedProblems, setSelectedProblems] = useState<
    { problemId: string; label: string; points: number }[]
  >([]);
  const [managingContestId, setManagingContestId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!getAdminToken()) router.push("/admin");
  }, [router]);

  const fetchContests = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/contests");
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem("adminToken");
        router.push("/admin");
        return;
      }
      const data = await res.json();
      setContests(data.contests);
    } catch {
      setError("Failed to fetch contests");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchProblems = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/problems");
      if (res.ok) {
        const data = await res.json();
        setAllProblems(data.problems);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchContests();
    fetchProblems();
  }, [fetchContests, fetchProblems]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setSelectedProblems([]);
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(c: AdminContest) {
    setTitle(c.title);
    setDescription(c.description || "");
    setStartTime(c.startTime.slice(0, 16));
    setEndTime(c.endTime.slice(0, 16));
    setSelectedProblems(
      c.contestProblems.map((cp) => ({
        problemId: cp.problem.id,
        label: cp.label,
        points: cp.points,
      })),
    );
    setEditingId(c.id);
    setShowForm(true);
    setManagingContestId(null);
    setError("");
    setSuccess("");
  }

  function addProblemRow() {
    const nextLabel = String.fromCharCode(65 + selectedProblems.length);
    setSelectedProblems([
      ...selectedProblems,
      { problemId: "", label: nextLabel, points: 100 },
    ]);
  }

  function removeProblemRow(idx: number) {
    setSelectedProblems(
      selectedProblems
        .filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, label: String.fromCharCode(65 + i) })),
    );
  }

  function updateProblemRow(
    idx: number,
    field: string,
    value: string | number,
  ) {
    const updated = [...selectedProblems];
    (updated[idx] as any)[field] = value;
    setSelectedProblems(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const body = { title, description, startTime, endTime };
      let res: Response;
      let contestId: string;
      if (editingId) {
        res = await adminFetch(`/api/admin/contests/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "Failed to update");
          return;
        }
        contestId = editingId;
      } else {
        res = await adminFetch("/api/admin/contests", {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "Failed to create");
          return;
        }
        const created = await res.json();
        contestId = created.contest.id;
      }
      const validProblems = selectedProblems.filter((p) => p.problemId);
      if (validProblems.length > 0) {
        const probRes = await adminFetch(
          `/api/admin/contests/${contestId}/problems`,
          { method: "POST", body: JSON.stringify({ problems: validProblems }) },
        );
        if (!probRes.ok) {
          const d = await probRes.json();
          setError(d.error || "Contest saved but failed to add problems");
          fetchContests();
          return;
        }
      }
      setSuccess(editingId ? "Contest updated!" : "Contest created!");
      resetForm();
      fetchContests();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contest?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await adminFetch(`/api/admin/contests/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Failed to delete");
        return;
      }
      setSuccess("Contest deleted");
      fetchContests();
    } catch {
      setError("Network error");
    }
  }

  function ManageProblemsPanel({ contest }: { contest: AdminContest }) {
    const [localProblems, setLocalProblems] = useState(
      contest.contestProblems.map((cp) => ({
        problemId: cp.problem.id,
        label: cp.label,
        points: cp.points,
      })),
    );
    const [savingProbs, setSavingProbs] = useState(false);
    function addRow() {
      setLocalProblems([
        ...localProblems,
        {
          problemId: "",
          label: String.fromCharCode(65 + localProblems.length),
          points: 100,
        },
      ]);
    }
    function removeRow(idx: number) {
      setLocalProblems(
        localProblems
          .filter((_, i) => i !== idx)
          .map((p, i) => ({ ...p, label: String.fromCharCode(65 + i) })),
      );
    }
    function updateRow(idx: number, field: string, value: string | number) {
      const u = [...localProblems];
      (u[idx] as any)[field] = value;
      setLocalProblems(u);
    }
    async function saveProblems() {
      setSavingProbs(true);
      setError("");
      const valid = localProblems.filter((p) => p.problemId);
      if (!valid.length) {
        setError("Add at least one problem");
        setSavingProbs(false);
        return;
      }
      try {
        const res = await adminFetch(
          `/api/admin/contests/${contest.id}/problems`,
          { method: "POST", body: JSON.stringify({ problems: valid }) },
        );
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "Failed to save");
          return;
        }
        setSuccess("Problems updated!");
        setManagingContestId(null);
        fetchContests();
      } catch {
        setError("Network error");
      } finally {
        setSavingProbs(false);
      }
    }
    return (
      <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-zinc-300">
            Manage Problems
          </h4>
          <button
            onClick={() => setManagingContestId(null)}
            className="text-zinc-600 hover:text-zinc-400"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {localProblems.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-8 text-center text-xs font-bold text-zinc-500">
                {p.label}
              </span>
              <select
                value={p.problemId}
                onChange={(e) => updateRow(idx, "problemId", e.target.value)}
                className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 outline-none [color-scheme:dark]"
              >
                <option value="">Select problem...</option>
                {allProblems.map((prob) => (
                  <option key={prob.id} value={prob.id}>
                    [{prob.difficulty}] {prob.title}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={p.points}
                onChange={(e) =>
                  updateRow(idx, "points", parseInt(e.target.value) || 100)
                }
                className="w-20 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-sm text-zinc-200 outline-none text-center [color-scheme:dark]"
              />
              <button
                onClick={() => removeRow(idx)}
                className="rounded-lg p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/[0.10] px-3 py-1.5 text-xs text-zinc-500 hover:border-white/[0.20] hover:text-zinc-300 transition-colors"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Problem
          </button>
          <button
            onClick={saveProblems}
            disabled={savingProbs}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {savingProbs ? "Saving..." : "Save Problems"}
          </button>
        </div>
      </div>
    );
  }

  function handleLogout() {
    sessionStorage.removeItem("adminToken");
    router.push("/admin");
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-zinc-100 font-sans antialiased">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />
      <div className="relative z-10 mx-auto max-w-5xl px-8 py-10 lg:px-16">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-px w-5 bg-red-700" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-500/70">
                Admin Panel
              </span>
            </div>
            <h1 className="text-3xl font-light tracking-tight">
              Manage <span className="text-zinc-500">Contests</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
                setSuccess("");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:brightness-110 transition-all"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Contest
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {/* Create / Edit Form */}
        {showForm && (
          <div className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? "Edit Contest" : "Create Contest"}
              </h2>
              <button
                onClick={resetForm}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Weekly Challenge #42"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the contest..."
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
              {/* Problem Selection */}
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Problems
                </label>
                <div className="space-y-2">
                  {selectedProblems.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-8 text-center text-xs font-bold text-zinc-500">
                        {p.label}
                      </span>
                      <select
                        value={p.problemId}
                        onChange={(e) =>
                          updateProblemRow(idx, "problemId", e.target.value)
                        }
                        className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 outline-none [color-scheme:dark]"
                      >
                        <option value="" className="bg-black">
                          Select problem...
                        </option>
                        {allProblems.map((prob) => (
                          <option
                            key={prob.id}
                            value={prob.id}
                            className="bg-black"
                          >
                            [{prob.difficulty}] {prob.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={p.points}
                        onChange={(e) =>
                          updateProblemRow(
                            idx,
                            "points",
                            parseInt(e.target.value) || 100,
                          )
                        }
                        className="w-20 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-sm text-zinc-200 outline-none text-center [color-scheme:dark]"
                        placeholder="pts"
                      />
                      <button
                        type="button"
                        onClick={() => removeProblemRow(idx)}
                        className="rounded-lg p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addProblemRow}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-white/[0.10] px-3 py-1.5 text-xs text-zinc-500 hover:border-white/[0.20] hover:text-zinc-300 transition-colors"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Problem
                </button>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving…
                    </>
                  ) : editingId ? (
                    "Update Contest"
                  ) : (
                    "Create Contest"
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm font-medium text-zinc-400 hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Contest List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
          </div>
        ) : contests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.07]">
              <svg
                className="h-8 w-8 text-zinc-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m3.044-1.35a6.726 6.726 0 01-2.748 1.35m0 0a6.772 6.772 0 01-3.044 0"
                />
              </svg>
            </div>
            <p className="text-sm text-zinc-600">No contests yet.</p>
            <p className="text-xs text-zinc-700 mt-1">
              Click &ldquo;New Contest&rdquo; to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contests.map((c) => (
              <div key={c.id}>
                <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04] hover:border-white/[0.12]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-semibold text-zinc-100 truncate">
                          {c.title}
                        </h3>
                        <StatusBadge status={c.status} />
                      </div>
                      {c.description && (
                        <p className="text-sm text-zinc-500 truncate">
                          {c.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-zinc-600">
                        <span>{new Date(c.startTime).toLocaleString()}</span>
                        <span className="text-zinc-800">&rarr;</span>
                        <span>{new Date(c.endTime).toLocaleString()}</span>
                        <span className="text-zinc-500">
                          {c._count?.contestParticipants ?? 0} participants
                        </span>
                      </div>
                      {c.contestProblems.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-zinc-600 mr-1">
                            Problems:
                          </span>
                          {c.contestProblems.map((cp) => (
                            <span
                              key={cp.id}
                              className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 text-[11px] text-zinc-400"
                            >
                              <span className="font-bold">{cp.label}</span>
                              <DiffBadge d={cp.problem.difficulty} />
                              <span className="text-zinc-600">
                                {cp.points}pts
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          setManagingContestId(
                            managingContestId === c.id ? null : c.id,
                          )
                        }
                        className="rounded-lg p-2 text-zinc-600 hover:bg-white/[0.06] hover:text-blue-400 transition-colors"
                        title="Manage Problems"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => startEdit(c)}
                        className="rounded-lg p-2 text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
                        title="Edit"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                {managingContestId === c.id && (
                  <ManageProblemsPanel contest={c} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
