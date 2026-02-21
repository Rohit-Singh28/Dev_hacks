/**
 * ContestTermination — Handles the full termination flow.
 *
 * When a contest is terminated (due to tab switching or clipboard abuse):
 *   1. Persist a "terminated" flag in localStorage (survives refresh).
 *   2. Call the backend API  POST /api/contest/end  to record the event
 *      server-side (prevents rating increase, flags the submission).
 *   3. Redirect the user to /contest-ended.
 *
 * The module also exposes helpers to check termination state and to lock
 * the UI (disable editor / submission buttons).
 */

import { api } from "@/lib/api";

// ── Storage key helpers ─────────────────────────────────────────────

function terminatedKey(contestId: string): string {
  return `cm_terminated_${contestId}`;
}

function terminationReasonKey(contestId: string): string {
  return `cm_termination_reason_${contestId}`;
}

// ── Public API ──────────────────────────────────────────────────────

export type TerminationReason =
  | "tab_switch"
  | "clipboard_abuse"
  | "screen_away"
  | "fullscreen_exit"
  | "screen_capture";

/**
 * Check whether this contest has already been terminated for the user.
 * This is called on page load to immediately lock the UI after a refresh.
 */
export function isContestTerminated(contestId: string): boolean {
  try {
    return localStorage.getItem(terminatedKey(contestId)) === "true";
  } catch {
    return false;
  }
}

/**
 * Get the stored termination reason (for display purposes).
 */
export function getTerminationReason(
  contestId: string,
): TerminationReason | null {
  try {
    return localStorage.getItem(
      terminationReasonKey(contestId),
    ) as TerminationReason | null;
  } catch {
    return null;
  }
}

/**
 * Execute the full termination sequence:
 *   localStorage flag → backend API → redirect.
 *
 * This function is idempotent — calling it multiple times for the same
 * contest will not create duplicate API calls.
 */
export async function terminateContest(
  contestId: string,
  reason: TerminationReason,
): Promise<void> {
  // Guard against double execution.
  if (isContestTerminated(contestId)) return;

  // 1. Persist locally so refresh keeps the lock.
  localStorage.setItem(terminatedKey(contestId), "true");
  localStorage.setItem(terminationReasonKey(contestId), reason);

  // 2. Notify backend (best-effort — UI locks regardless).
  try {
    await api.post("/contest/end", { contestId, reason });
  } catch (err) {
    // Swallow network errors; the local flag is already set.
    console.error("[ContestMonitor] Failed to notify backend:", err);
  }

  // 3. Redirect to the termination page.
  //    Uses window.location for a hard navigation to ensure all state resets.
  window.location.href = `/contest-ended?contestId=${contestId}&reason=${reason}`;
}

/**
 * Clear all monitoring data for a contest.
 * Useful for admins / testing / when a contest officially ends.
 */
export function clearMonitoringData(contestId: string): void {
  const keys = [
    `cm_tab_switches_${contestId}`,
    `cm_clipboard_count_${contestId}`,
    `cm_screen_violations_${contestId}`,
    `cm_fullscreen_violations_${contestId}`,
    `cm_screencapture_violations_${contestId}`,
    terminatedKey(contestId),
    terminationReasonKey(contestId),
  ];
  keys.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
}
