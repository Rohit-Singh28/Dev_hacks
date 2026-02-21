/**
 * ScreenCaptureMonitor — Detects and prevents screen recording / screen sharing.
 *
 * Detection layers:
 *   1. **getDisplayMedia interception** — Monkey-patches
 *      `navigator.mediaDevices.getDisplayMedia` so any call (from browser
 *      extensions, DevTools, or JS) is blocked and recorded as a violation.
 *
 *   2. **Display Capture Permissions API** — Periodically queries the
 *      `display-capture` permission status (where supported) to detect
 *      changes that indicate screen capture was granted.
 *
 *   3. **Keyboard shortcut interception** — Blocks well-known screen
 *      recording keyboard shortcuts:
 *        • Win+G (Xbox Game Bar)
 *        • Win+Alt+R (Game Bar record)
 *        • Ctrl+Shift+S / Cmd+Shift+S (various screenshot tools)
 *        • PrintScreen
 *
 *   4. **Picture-in-Picture detection** — Detects if the page enters PiP
 *      mode, which could be used to view content while recording another
 *      window.
 *
 * The violation counter is persisted in localStorage so a page refresh does
 * NOT reset progress toward termination.
 *
 * Flow:
 *   capture detected → onViolation() → caller shows warning
 *   violations ≥ max → onTerminate() → contest locked
 */

export interface ScreenCaptureMonitorConfig {
  /** Maximum violations before auto-termination (default: 3). */
  maxViolations: number;
  /** Unique key prefix for localStorage (scoped per contest). */
  contestId: string;
  /** Called on every violation with the current count. */
  onViolation: (count: number) => void;
  /** Called when maxViolations is reached or exceeded. */
  onTerminate: () => void;
  /**
   * Called when any capture attempt is detected so the caller can
   * immediately show a black overlay. The boolean indicates whether
   * capture is active (true) or the threat has passed (false).
   */
  onCaptureAttempt?: (active: boolean) => void;
}

export class ScreenCaptureMonitor {
  private config: ScreenCaptureMonitorConfig;
  private storageKey: string;
  private destroyed = false;
  private started = false;

  // Original reference so we can restore on destroy.
  private originalGetDisplayMedia:
    | typeof navigator.mediaDevices.getDisplayMedia
    | null = null;

  private boundKeydownHandler: (e: KeyboardEvent) => void;
  private boundPipHandler: () => void;
  private permissionCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ScreenCaptureMonitorConfig) {
    this.config = config;
    this.storageKey = `cm_screencapture_violations_${config.contestId}`;

    this.boundKeydownHandler = this.handleKeydown.bind(this);
    this.boundPipHandler = this.handlePiP.bind(this);
  }

  // ── Public API ───────────────────────────────────────────────────

  start(): void {
    if (this.destroyed || this.started) return;
    this.started = true;

    // If already past the limit (e.g. user refreshed after termination),
    // fire the terminate callback immediately.
    if (this.getCount() >= this.config.maxViolations) {
      this.config.onTerminate();
      return;
    }

    this.interceptGetDisplayMedia();
    this.startPermissionPolling();
    this.interceptKeyboardShortcuts();
    this.detectPictureInPicture();
  }

  destroy(): void {
    this.destroyed = true;

    // Restore original getDisplayMedia.
    if (this.originalGetDisplayMedia && navigator.mediaDevices) {
      navigator.mediaDevices.getDisplayMedia = this.originalGetDisplayMedia;
    }

    document.removeEventListener("keydown", this.boundKeydownHandler, true);

    if (this.permissionCheckTimer) {
      clearInterval(this.permissionCheckTimer);
      this.permissionCheckTimer = null;
    }

    document.removeEventListener(
      "enterpictureinpicture",
      this.boundPipHandler,
      true,
    );
  }

  getCount(): number {
    try {
      return parseInt(localStorage.getItem(this.storageKey) || "0", 10);
    } catch {
      return 0;
    }
  }

  // ── Layer 1: getDisplayMedia interception ─────────────────────

  private interceptGetDisplayMedia(): void {
    if (!navigator.mediaDevices) return;

    this.originalGetDisplayMedia =
      navigator.mediaDevices.getDisplayMedia?.bind(navigator.mediaDevices) ??
      null;

    const self = this;

    navigator.mediaDevices.getDisplayMedia = async function (
      _constraints?: DisplayMediaStreamOptions,
    ): Promise<MediaStream> {
      // Flash the blackout overlay immediately.
      self.config.onCaptureAttempt?.(true);

      // Block the call and record a violation.
      self.recordViolation();

      // Immediately stop any tracks if somehow a stream was created.
      throw new DOMException(
        "Screen sharing is not allowed during the contest.",
        "NotAllowedError",
      );
    };
  }

  // ── Layer 2: Permissions API polling ──────────────────────────

  private startPermissionPolling(): void {
    if (!navigator.permissions) return;

    const checkPermission = async () => {
      try {
        const status = await navigator.permissions.query({
          name: "display-capture" as PermissionName,
        });

        if (status.state === "granted") {
          // Screen capture permission was granted — record violation.
          this.recordViolation();
        }

        // Also listen for real-time changes.
        status.onchange = () => {
          if (status.state === "granted") {
            this.recordViolation();
          }
        };
      } catch {
        // `display-capture` permission query not supported — skip.
      }
    };

    // Check immediately, then every 5 seconds.
    checkPermission();
    this.permissionCheckTimer = setInterval(checkPermission, 5000);
  }

  // ── Layer 3: Keyboard shortcut interception ───────────────────

  private interceptKeyboardShortcuts(): void {
    document.addEventListener("keydown", this.boundKeydownHandler, true);
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (this.destroyed) return;

    const key = e.key.toLowerCase();

    // PrintScreen key
    if (e.key === "PrintScreen") {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.recordViolation();
      return;
    }

    // Win+G (Xbox Game Bar) — Meta key + G
    if (e.metaKey && key === "g") {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.recordViolation();
      return;
    }

    // Win+Alt+R (Game Bar record)
    if (e.metaKey && e.altKey && key === "r") {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.recordViolation();
      return;
    }

    // Ctrl+Shift+S / Cmd+Shift+S (screenshot tools)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "s") {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.recordViolation();
      return;
    }

    // Ctrl+Shift+I / Cmd+Option+I (DevTools — may host recording extensions)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "i") {
      e.preventDefault();
      e.stopImmediatePropagation();
      return; // Block but don't count as capture violation.
    }
  }

  // ── Layer 4: Picture-in-Picture detection ─────────────────────

  private detectPictureInPicture(): void {
    document.addEventListener(
      "enterpictureinpicture",
      this.boundPipHandler,
      true,
    );
  }

  private handlePiP(): void {
    if (this.destroyed) return;

    // Exit PiP immediately.
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }

    this.recordViolation();
  }

  // ── Violation recording ───────────────────────────────────────

  private recordViolation(): void {
    if (this.destroyed) return;

    // Flash blackout on every capture attempt.
    this.config.onCaptureAttempt?.(true);

    const count = this.getCount() + 1;
    localStorage.setItem(this.storageKey, String(count));

    if (count >= this.config.maxViolations) {
      this.config.onTerminate();
      this.destroy();
    } else {
      this.config.onViolation(count);
    }
  }
}
