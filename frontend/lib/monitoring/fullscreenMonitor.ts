/**
 * FullscreenMonitor — Forces the browser into fullscreen mode when entering
 * a contest and detects exits from fullscreen.
 *
 * Strategy:
 *   1. Request Fullscreen API on `document.documentElement`.
 *   2. Listen for `fullscreenchange` events to detect when user presses
 *      Escape or otherwise exits fullscreen.
 *   3. On exit, immediately re-request fullscreen and record a violation.
 *   4. After `maxViolations` exits, trigger contest termination.
 *
 * The violation counter is persisted in localStorage so a page refresh does
 * NOT reset progress toward termination.
 *
 * Flow:
 *   fullscreen exited → violation recorded → re-request fullscreen
 *   violations ≥ max  → onTerminate() callback → contest locked
 */

export interface FullscreenMonitorConfig {
  /** Maximum violations before auto-termination (default: 3). */
  maxViolations: number;
  /** Unique key prefix for localStorage (scoped per contest). */
  contestId: string;
  /** Called on every violation with the current count. */
  onViolation: (count: number) => void;
  /** Called when maxViolations is reached or exceeded. */
  onTerminate: () => void;
  /** Called when fullscreen state changes. */
  onFullscreenChange?: (isFullscreen: boolean) => void;
  /** Called if fullscreen request fails (e.g. browser blocks it). */
  onFullscreenError?: (error: Error) => void;
}

export class FullscreenMonitor {
  private config: FullscreenMonitorConfig;
  private storageKey: string;
  private boundHandler: () => void;
  private destroyed = false;
  private started = false;
  /** Flag to suppress counting when WE are the ones requesting fullscreen. */
  private requestingFullscreen = false;

  constructor(config: FullscreenMonitorConfig) {
    this.config = config;
    this.storageKey = `cm_fullscreen_violations_${config.contestId}`;
    this.boundHandler = this.handleFullscreenChange.bind(this);
  }

  // ── Public API ───────────────────────────────────────────────────

  /**
   * Enter fullscreen and begin monitoring.
   * Returns a promise that resolves once fullscreen is active.
   */
  async start(): Promise<void> {
    if (this.destroyed || this.started) return;
    this.started = true;

    // If already past the limit (e.g. user refreshed after termination),
    // fire the terminate callback immediately.
    if (this.getCount() >= this.config.maxViolations) {
      this.config.onTerminate();
      return;
    }

    // Register the listener BEFORE requesting fullscreen so we catch the
    // initial change event (helps with some browsers that fire it immediately).
    document.addEventListener("fullscreenchange", this.boundHandler);
    document.addEventListener("webkitfullscreenchange", this.boundHandler);

    await this.requestFullscreen();
  }

  /** Stop monitoring and exit fullscreen. */
  destroy(): void {
    this.destroyed = true;
    document.removeEventListener("fullscreenchange", this.boundHandler);
    document.removeEventListener("webkitfullscreenchange", this.boundHandler);

    // Exit fullscreen gracefully if still in fullscreen.
    if (this.isFullscreen()) {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  /** Read the current persisted violation count. */
  getCount(): number {
    try {
      return parseInt(localStorage.getItem(this.storageKey) || "0", 10);
    } catch {
      return 0;
    }
  }

  /** Check if the browser is currently in fullscreen. */
  isFullscreen(): boolean {
    return !!(
      document.fullscreenElement || (document as any).webkitFullscreenElement
    );
  }

  // ── Internal ─────────────────────────────────────────────────────

  private async requestFullscreen(): Promise<void> {
    try {
      this.requestingFullscreen = true;
      const el = document.documentElement as any;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
    } catch (err) {
      console.error("[FullscreenMonitor] Fullscreen request failed:", err);
      this.config.onFullscreenError?.(
        err instanceof Error ? err : new Error(String(err)),
      );
    } finally {
      // Use a microtask delay so the fullscreenchange handler runs first.
      setTimeout(() => {
        this.requestingFullscreen = false;
      }, 300);
    }
  }

  private handleFullscreenChange(): void {
    if (this.destroyed) return;

    const isFs = this.isFullscreen();
    this.config.onFullscreenChange?.(isFs);

    if (!isFs && !this.requestingFullscreen) {
      // User exited fullscreen — record violation.
      this.recordViolation();

      // Re-request fullscreen (unless we're past the limit).
      if (this.getCount() < this.config.maxViolations) {
        // Small delay to avoid browser blocking rapid re-requests.
        setTimeout(() => {
          if (!this.destroyed) {
            this.requestFullscreen();
          }
        }, 500);
      }
    }
  }

  /**
   * Increment persisted counter and invoke the appropriate callback.
   * Terminates immediately if the threshold is met.
   */
  private recordViolation(): void {
    if (this.destroyed) return;

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
