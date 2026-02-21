/**
 * TabMonitor — Detects tab switches and window minimizations.
 *
 * Uses two complementary browser APIs for robust detection:
 *   1. Page Visibility API (`visibilitychange`) — fires when the tab becomes
 *      hidden/visible (tab switch, minimize, OS-level app switch).
 *   2. `focus` / `blur` window events — catches edge cases the Visibility API
 *      misses (e.g. switching to a different window without hiding the tab).
 *
 * The switch counter is persisted in localStorage so a page refresh does NOT
 * reset progress toward termination.
 *
 * Flow:
 *   switch detected → onSwitch() callback → caller shows warning
 *   switches > MAX   → onTerminate() callback → caller locks the contest
 */

export interface TabMonitorConfig {
  /** Maximum allowed tab/focus switches before auto-termination. */
  maxSwitches: number;
  /** Unique key prefix for localStorage (scoped per contest). */
  contestId: string;
  /** Called on every switch with the current count. */
  onSwitch: (count: number) => void;
  /** Called when maxSwitches is exceeded. */
  onTerminate: () => void;
}

export class TabMonitor {
  private config: TabMonitorConfig;
  private storageKey: string;
  private boundVisibilityHandler: () => void;
  private boundBlurHandler: () => void;
  private boundFocusHandler: () => void;
  /** Tracks whether the page is currently focused to avoid duplicate counts. */
  private isFocused = true;
  private destroyed = false;

  constructor(config: TabMonitorConfig) {
    this.config = config;
    this.storageKey = `cm_tab_switches_${config.contestId}`;

    // Bind handlers once to allow clean removal later (no memory leaks).
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
    this.boundBlurHandler = this.handleBlur.bind(this);
    this.boundFocusHandler = this.handleFocus.bind(this);
  }

  // ── Public API ───────────────────────────────────────────────────

  /** Start monitoring. Safe to call multiple times (idempotent). */
  start(): void {
    if (this.destroyed) return;

    document.addEventListener("visibilitychange", this.boundVisibilityHandler);
    window.addEventListener("blur", this.boundBlurHandler);
    window.addEventListener("focus", this.boundFocusHandler);

    // If the page is already hidden on mount (e.g. opened in background tab)
    // we treat it as the user being away.
    if (document.visibilityState === "hidden") {
      this.isFocused = false;
    }

    // Check on start if already terminated (e.g. user refreshed after termination)
    if (this.getCount() > this.config.maxSwitches) {
      this.config.onTerminate();
    }
  }

  /** Stop monitoring and remove all listeners. */
  destroy(): void {
    this.destroyed = true;
    document.removeEventListener(
      "visibilitychange",
      this.boundVisibilityHandler,
    );
    window.removeEventListener("blur", this.boundBlurHandler);
    window.removeEventListener("focus", this.boundFocusHandler);
  }

  /** Read the current persisted switch count. */
  getCount(): number {
    try {
      return parseInt(localStorage.getItem(this.storageKey) || "0", 10);
    } catch {
      return 0;
    }
  }

  // ── Internal Handlers ────────────────────────────────────────────

  /**
   * Visibility API handler — fires on tab switch / minimize / app switch.
   * We only count when the page becomes hidden (not on return to visible).
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === "hidden") {
      this.recordSwitch();
    }
  }

  /**
   * Window blur — catches cases where user clicks another window without
   * fully hiding the tab (Visibility API may not fire).
   */
  private handleBlur(): void {
    if (this.isFocused) {
      this.isFocused = false;
      // Only count if Visibility API didn't already count (page still visible).
      if (document.visibilityState === "visible") {
        this.recordSwitch();
      }
    }
  }

  /** Window focus — simply resets the focused flag. */
  private handleFocus(): void {
    this.isFocused = true;
  }

  /**
   * Increment persisted counter and invoke the appropriate callback.
   * Immediately terminates if the threshold is exceeded.
   */
  private recordSwitch(): void {
    if (this.destroyed) return;

    const count = this.getCount() + 1;
    localStorage.setItem(this.storageKey, String(count));

    if (count > this.config.maxSwitches) {
      this.config.onTerminate();
      this.destroy(); // Stop monitoring after termination.
    } else {
      this.config.onSwitch(count);
    }
  }
}
