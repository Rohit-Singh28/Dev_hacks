/**
 * ClipboardMonitor — Detects copy, paste, and cut actions.
 *
 * Detection is layered for completeness:
 *   1. Native clipboard events (`copy`, `paste`, `cut` on `document`).
 *   2. Keyboard shortcut interception (`keydown` on `document`) for
 *      Ctrl/Cmd + C/V/X. This catches scenarios where the clipboard event
 *      is suppressed by custom editors (e.g. Monaco).
 *
 * The action counter is persisted in localStorage to survive page refreshes.
 *
 * Behaviour:
 *   1st clipboard action  → onWarning() — show a warning, admin may review.
 *   2nd+ clipboard action → onTerminate() — auto-terminate the contest.
 */

export interface ClipboardMonitorConfig {
  /** Unique key prefix for localStorage (scoped per contest). */
  contestId: string;
  /** Called on the first clipboard action. */
  onWarning: () => void;
  /** Called on repeated clipboard actions; triggers termination. */
  onTerminate: () => void;
}

export class ClipboardMonitor {
  private config: ClipboardMonitorConfig;
  private storageKey: string;

  private boundClipboardHandler: (e: Event) => void;
  private boundKeydownHandler: (e: KeyboardEvent) => void;
  private destroyed = false;

  /**
   * Debounce flag — prevents double-counting when both a keyboard shortcut
   * AND a native clipboard event fire for the same action.
   */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: ClipboardMonitorConfig) {
    this.config = config;
    this.storageKey = `cm_clipboard_count_${config.contestId}`;

    this.boundClipboardHandler = this.handleClipboardEvent.bind(this);
    this.boundKeydownHandler = this.handleKeydown.bind(this);
  }

  // ── Public API ───────────────────────────────────────────────────

  start(): void {
    if (this.destroyed) return;

    // Native clipboard events
    document.addEventListener("copy", this.boundClipboardHandler, true);
    document.addEventListener("paste", this.boundClipboardHandler, true);
    document.addEventListener("cut", this.boundClipboardHandler, true);

    // Keyboard shortcut interception
    document.addEventListener("keydown", this.boundKeydownHandler, true);

    // If already terminated from a previous session, fire immediately.
    if (this.getCount() > 1) {
      this.config.onTerminate();
    }
  }

  destroy(): void {
    this.destroyed = true;
    document.removeEventListener("copy", this.boundClipboardHandler, true);
    document.removeEventListener("paste", this.boundClipboardHandler, true);
    document.removeEventListener("cut", this.boundClipboardHandler, true);
    document.removeEventListener("keydown", this.boundKeydownHandler, true);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  getCount(): number {
    try {
      return parseInt(localStorage.getItem(this.storageKey) || "0", 10);
    } catch {
      return 0;
    }
  }

  // ── Internal Handlers ────────────────────────────────────────────

  /**
   * Handles native clipboard events (copy/paste/cut).
   * Uses debounce to avoid double-counting with the keydown handler.
   */
  private handleClipboardEvent(_e: Event): void {
    this.debouncedRecord();
  }

  /**
   * Keyboard shortcut handler — detects Ctrl/Cmd + C, V, X.
   * Captures in the capture phase so it fires before editors can swallow it.
   */
  private handleKeydown(e: KeyboardEvent): void {
    const isModifier = e.ctrlKey || e.metaKey;
    const isClipboardKey = ["c", "v", "x"].includes(e.key.toLowerCase());

    if (isModifier && isClipboardKey) {
      this.debouncedRecord();
    }
  }

  /**
   * Debounce wrapper — if a clipboard event and a keydown fire within 300ms
   * of each other (same user action), only count once.
   */
  private debouncedRecord(): void {
    if (this.destroyed) return;
    if (this.debounceTimer) return; // Already processing this action.

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
    }, 300);

    this.recordAction();
  }

  /**
   * Persist the counter and invoke the appropriate callback.
   */
  private recordAction(): void {
    const count = this.getCount() + 1;
    localStorage.setItem(this.storageKey, String(count));

    if (count === 1) {
      // First offence → warning only.
      this.config.onWarning();
    } else {
      // Repeat offence → terminate.
      this.config.onTerminate();
      this.destroy();
    }
  }
}
