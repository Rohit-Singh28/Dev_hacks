"use client";

/**
 * useContestMonitor — React hook that wires TabMonitor + ClipboardMonitor
 * into the component lifecycle.
 *
 * Returns:
 *   • `terminated`    — boolean, true once the contest was auto-terminated.
 *   • `dialogState`   — the current warning/termination dialog config.
 *   • `dismissDialog` — callback to acknowledge a warning.
 *   • `tabSwitchCount`— live count for optional UI display.
 *
 * Usage:
 *   const { terminated, dialogState, dismissDialog } = useContestMonitor(contestId);
 *   // Render <WarningDialog {...dialogState} onDismiss={dismissDialog} />
 *   // Disable editor/buttons when `terminated` is true.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  TabMonitor,
  ClipboardMonitor,
  terminateContest,
  isContestTerminated,
} from "@/lib/monitoring";

const MAX_TAB_SWITCHES = 3;

export interface DialogState {
  open: boolean;
  type: "warning" | "terminated";
  title: string;
  message: string;
}

const INITIAL_DIALOG: DialogState = {
  open: false,
  type: "warning",
  title: "",
  message: "",
};

export function useContestMonitor(contestId: string | null) {
  const [terminated, setTerminated] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>(INITIAL_DIALOG);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Refs to hold monitor instances so we can destroy them in cleanup.
  const tabMonitorRef = useRef<TabMonitor | null>(null);
  const clipboardMonitorRef = useRef<ClipboardMonitor | null>(null);

  // ── Termination handler (shared by both monitors) ─────────────

  const handleTermination = useCallback(
    async (reason: "tab_switch" | "clipboard_abuse") => {
      if (!contestId) return;

      setTerminated(true);
      setDialogState({
        open: true,
        type: "terminated",
        title: "Contest Terminated",
        message:
          reason === "tab_switch"
            ? "Your contest has been terminated because you switched tabs or windows too many times. Your rating will not be updated for this contest."
            : "Your contest has been terminated due to repeated clipboard usage (copy/paste/cut). Your rating will not be updated for this contest.",
      });

      // Destroy both monitors to prevent further events.
      tabMonitorRef.current?.destroy();
      clipboardMonitorRef.current?.destroy();

      // Execute the full termination flow (localStorage + API + redirect).
      await terminateContest(contestId, reason);
    },
    [contestId],
  );

  // ── Initialise monitors ───────────────────────────────────────

  useEffect(() => {
    if (!contestId) return;

    // If the contest was already terminated (e.g. user refreshed), lock immediately.
    if (isContestTerminated(contestId)) {
      setTerminated(true);
      setDialogState({
        open: true,
        type: "terminated",
        title: "Contest Terminated",
        message:
          "This contest has already been terminated due to a policy violation. Your rating will not be updated.",
      });
      // Redirect to the ended page after a short delay so user sees the message.
      const timer = setTimeout(() => {
        window.location.href = `/contest-ended?contestId=${contestId}`;
      }, 2000);
      return () => clearTimeout(timer);
    }

    // ── Tab Monitor ──────────────────────────────────────────────

    const tabMonitor = new TabMonitor({
      maxSwitches: MAX_TAB_SWITCHES,
      contestId,

      onSwitch: (count: number) => {
        setTabSwitchCount(count);
        const remaining = MAX_TAB_SWITCHES - count;
        setDialogState({
          open: true,
          type: "warning",
          title: "Tab Switch Detected",
          message:
            remaining > 0
              ? `You switched away from the contest tab. You have ${remaining} warning${remaining === 1 ? "" : "s"} remaining before your contest is automatically terminated.`
              : "This is your final warning. One more tab switch will terminate your contest.",
        });
      },

      onTerminate: () => {
        handleTermination("tab_switch");
      },
    });

    // ── Clipboard Monitor ────────────────────────────────────────

    const clipboardMonitor = new ClipboardMonitor({
      contestId,

      onWarning: () => {
        setDialogState({
          open: true,
          type: "warning",
          title: "Clipboard Usage Detected",
          message:
            "Warning: Clipboard usage detected. Admin may review your code. Further clipboard actions will result in automatic contest termination.",
        });
      },

      onTerminate: () => {
        handleTermination("clipboard_abuse");
      },
    });

    tabMonitorRef.current = tabMonitor;
    clipboardMonitorRef.current = clipboardMonitor;

    // Hydrate tab switch count from persisted storage.
    setTabSwitchCount(tabMonitor.getCount());

    // Start both monitors.
    tabMonitor.start();
    clipboardMonitor.start();

    // ── Cleanup on unmount ───────────────────────────────────────
    return () => {
      tabMonitor.destroy();
      clipboardMonitor.destroy();
    };
  }, [contestId, handleTermination]);

  // ── Dismiss callback ──────────────────────────────────────────

  const dismissDialog = useCallback(() => {
    // Only allow dismissal for warnings, not termination dialogs.
    if (dialogState.type === "warning") {
      setDialogState(INITIAL_DIALOG);
    }
  }, [dialogState.type]);

  return {
    terminated,
    dialogState,
    dismissDialog,
    tabSwitchCount,
  };
}
