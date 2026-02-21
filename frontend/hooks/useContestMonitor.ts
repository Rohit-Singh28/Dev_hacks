"use client";

/**
 * useContestMonitor — React hook that wires TabMonitor + ClipboardMonitor
 * + ScreenMonitor (camera-based face detection) into the component lifecycle.
 *
 * Returns:
 *   • `terminated`          — boolean, true once the contest was auto-terminated.
 *   • `dialogState`         — the current warning/termination dialog config.
 *   • `dismissDialog`       — callback to acknowledge a warning.
 *   • `tabSwitchCount`      — live count for optional UI display.
 *   • `screenViolationCount`— live count of face-away violations.
 *   • `cameraStream`        — MediaStream from the webcam (null until ready).
 *   • `faceDetected`        — whether a face is currently visible.
 *   • `cameraError`         — true if camera access was denied / failed.
 *
 * Usage:
 *   const m = useContestMonitor(contestId);
 *   // Render <WarningDialog {...m.dialogState} onDismiss={m.dismissDialog} />
 *   // Render <CameraFeed stream={m.cameraStream} faceDetected={m.faceDetected} />
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  TabMonitor,
  ClipboardMonitor,
  ScreenMonitor,
  FullscreenMonitor,
  ScreenCaptureMonitor,
  ContentProtection,
  terminateContest,
  isContestTerminated,
} from "@/lib/monitoring";

const MAX_TAB_SWITCHES = 3;
const MAX_SCREEN_VIOLATIONS = 3;
const MAX_FULLSCREEN_VIOLATIONS = 3;
const MAX_SCREEN_CAPTURE_VIOLATIONS = 3;
const SCREEN_AWAY_THRESHOLD_MS = 10_000; // 10 seconds

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
  const [screenViolationCount, setScreenViolationCount] = useState(0);
  const [fullscreenViolationCount, setFullscreenViolationCount] = useState(0);
  const [screenCaptureViolationCount, setScreenCaptureViolationCount] =
    useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [faceDetected, setFaceDetected] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs to hold monitor instances so we can destroy them in cleanup.
  const tabMonitorRef = useRef<TabMonitor | null>(null);
  const clipboardMonitorRef = useRef<ClipboardMonitor | null>(null);
  const screenMonitorRef = useRef<ScreenMonitor | null>(null);
  const fullscreenMonitorRef = useRef<FullscreenMonitor | null>(null);
  const screenCaptureMonitorRef = useRef<ScreenCaptureMonitor | null>(null);
  const contentProtectionRef = useRef<ContentProtection | null>(null);
  const [screenBlackout, setScreenBlackout] = useState(false);

  // ── Termination handler (shared by both monitors) ─────────────

  const handleTermination = useCallback(
    async (
      reason:
        | "tab_switch"
        | "clipboard_abuse"
        | "screen_away"
        | "fullscreen_exit"
        | "screen_capture",
    ) => {
      if (!contestId) return;

      const messages: Record<string, string> = {
        tab_switch:
          "Your contest has been terminated because you switched tabs or windows too many times. Your rating will not be updated for this contest.",
        clipboard_abuse:
          "Your contest has been terminated due to repeated clipboard usage (copy/paste/cut). Your rating will not be updated for this contest.",
        screen_away:
          "Your contest has been terminated because you were not detected in front of the screen too many times. Your rating will not be updated for this contest.",
        fullscreen_exit:
          "Your contest has been terminated because you exited fullscreen mode too many times. You must remain in fullscreen during the contest. Your rating will not be updated.",
        screen_capture:
          "Your contest has been terminated because screen recording or screen sharing was detected. Your rating will not be updated for this contest.",
      };

      setTerminated(true);
      setDialogState({
        open: true,
        type: "terminated",
        title: "Contest Terminated",
        message: messages[reason],
      });

      // Destroy all monitors to prevent further events.
      tabMonitorRef.current?.destroy();
      clipboardMonitorRef.current?.destroy();
      screenMonitorRef.current?.destroy();
      fullscreenMonitorRef.current?.destroy();
      screenCaptureMonitorRef.current?.destroy();
      contentProtectionRef.current?.destroy();

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

    // ── Screen Monitor (camera-based face detection) ──────────────

    const screenMonitor = new ScreenMonitor({
      maxViolations: MAX_SCREEN_VIOLATIONS,
      awayThresholdMs: SCREEN_AWAY_THRESHOLD_MS,
      contestId,

      onViolation: (count: number) => {
        setScreenViolationCount(count);
        const remaining = MAX_SCREEN_VIOLATIONS - count;
        setDialogState({
          open: true,
          type: "warning",
          title: "Face Not Detected",
          message:
            remaining > 0
              ? `You were not detected in front of the screen for more than 10 seconds. You have ${remaining} warning${remaining === 1 ? "" : "s"} remaining before your contest is automatically terminated.`
              : "This is your final warning. Being away from the screen for over 10 seconds again will terminate your contest.",
        });
      },

      onTerminate: () => {
        handleTermination("screen_away");
      },

      onCameraReady: (stream: MediaStream) => {
        setCameraStream(stream);
      },

      onCameraError: () => {
        setCameraError(true);
      },

      onFaceStatusChange: (detected: boolean) => {
        setFaceDetected(detected);
      },
    });

    tabMonitorRef.current = tabMonitor;
    clipboardMonitorRef.current = clipboardMonitor;
    screenMonitorRef.current = screenMonitor;

    // ── Fullscreen Monitor ────────────────────────────────────────

    const fullscreenMonitor = new FullscreenMonitor({
      maxViolations: MAX_FULLSCREEN_VIOLATIONS,
      contestId,

      onViolation: (count: number) => {
        setFullscreenViolationCount(count);
        const remaining = MAX_FULLSCREEN_VIOLATIONS - count;
        setDialogState({
          open: true,
          type: "warning",
          title: "Fullscreen Exited",
          message:
            remaining > 0
              ? `You exited fullscreen mode. You must remain in fullscreen during the contest. You have ${remaining} warning${remaining === 1 ? "" : "s"} remaining before your contest is automatically terminated.`
              : "This is your final warning. Exiting fullscreen once more will terminate your contest.",
        });
      },

      onTerminate: () => {
        handleTermination("fullscreen_exit");
      },

      onFullscreenChange: (isFull: boolean) => {
        setIsFullscreen(isFull);
      },

      onFullscreenError: (err: Error) => {
        console.warn("[useContestMonitor] Fullscreen error:", err.message);
      },
    });

    // ── Screen Capture Monitor ────────────────────────────────────

    const screenCaptureMonitor = new ScreenCaptureMonitor({
      maxViolations: MAX_SCREEN_CAPTURE_VIOLATIONS,
      contestId,

      onViolation: (count: number) => {
        setScreenCaptureViolationCount(count);
        const remaining = MAX_SCREEN_CAPTURE_VIOLATIONS - count;
        setDialogState({
          open: true,
          type: "warning",
          title: "Screen Recording / Sharing Detected",
          message:
            remaining > 0
              ? `Screen recording or screen sharing was detected. This is not allowed during the contest. You have ${remaining} warning${remaining === 1 ? "" : "s"} remaining before your contest is automatically terminated.`
              : "This is your final warning. Any further screen recording or sharing attempt will terminate your contest.",
        });
      },

      onTerminate: () => {
        handleTermination("screen_capture");
      },

      onCaptureAttempt: (active: boolean) => {
        setScreenBlackout(active);
        if (active) {
          contentProtection.showBlackout();
          // Auto-hide after 3 seconds (violation dialog is already shown).
          setTimeout(() => {
            setScreenBlackout(false);
            contentProtection.hideBlackout();
          }, 3000);
        } else {
          contentProtection.hideBlackout();
        }
      },
    });

    // ── Content Protection (DRM overlay, CSS protections) ─────────

    const contentProtection = new ContentProtection();
    contentProtection.enable();
    contentProtectionRef.current = contentProtection;

    fullscreenMonitorRef.current = fullscreenMonitor;
    screenCaptureMonitorRef.current = screenCaptureMonitor;

    // Hydrate counts from persisted storage.
    setTabSwitchCount(tabMonitor.getCount());
    setScreenViolationCount(screenMonitor.getCount());
    setFullscreenViolationCount(fullscreenMonitor.getCount());
    setScreenCaptureViolationCount(screenCaptureMonitor.getCount());

    // Start all monitors.
    tabMonitor.start();
    clipboardMonitor.start();
    screenMonitor.start(); // async — requests camera permission
    fullscreenMonitor.start(); // async — requests fullscreen
    screenCaptureMonitor.start();

    // ── Cleanup on unmount ───────────────────────────────────────
    return () => {
      tabMonitor.destroy();
      clipboardMonitor.destroy();
      screenMonitor.destroy();
      fullscreenMonitor.destroy();
      screenCaptureMonitor.destroy();
      contentProtection.destroy();
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
    screenViolationCount,
    fullscreenViolationCount,
    screenCaptureViolationCount,
    screenBlackout,
    isFullscreen,
    cameraStream,
    faceDetected,
    cameraError,
  };
}
