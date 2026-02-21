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
 * Threshold: Only clipboard content with >20 words OR >300 alphabetic
 * characters is flagged. Small snippets (variable names, short lines) are
 * allowed so normal coding isn't disrupted.
 *
 * Behaviour:
 *   1st large clipboard action  → onWarning() — show a warning, admin may review.
 *   2nd+ large clipboard action → onTerminate() — auto-terminate the contest.
 */

/** Minimum thresholds — content below BOTH limits is ignored. */
const WORD_THRESHOLD = 20;
const ALPHA_THRESHOLD = 300;

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

  // ── Content size helpers ──────────────────────────────────────

  /**
   * Returns true if `text` exceeds the safe threshold:
   *   • more than 20 words, OR
   *   • more than 300 alphabetic characters.
   */
  private static exceedsThreshold(text: string): boolean {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
    return wordCount > WORD_THRESHOLD || alphaCount > ALPHA_THRESHOLD;
  }

  /**
   * Handles native clipboard events (copy/paste/cut).
   * Reads the clipboard content from the ClipboardEvent and only
   * records if it exceeds the size threshold.
   */
  private handleClipboardEvent(e: Event): void {
    const ce = e as ClipboardEvent;
    let text = "";

    if (ce.type === "paste") {
      // For paste, read from the event's clipboardData.
      text = ce.clipboardData?.getData("text/plain") ?? "";
    } else {
      // For copy/cut, read the current selection.
      text = window.getSelection()?.toString() ?? "";
    }

    if (ClipboardMonitor.exceedsThreshold(text)) {
      this.debouncedRecord();
    }
  }

  /**
   * Keyboard shortcut handler — detects Ctrl/Cmd + C, V, X.
   * Captures in the capture phase so it fires before editors can swallow it.
   *
   * For copy/cut (C/X) we read window.getSelection synchronously.
   * For paste (V) we attempt navigator.clipboard.readText (async); if
   * that fails (permissions) we fall back to recording unconditionally
   * since we can't inspect the content.
   */
  private handleKeydown(e: KeyboardEvent): void {
    const isModifier = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    const isClipboardKey = ["c", "v", "x"].includes(key);

    if (!isModifier || !isClipboardKey) return;

    if (key === "c" || key === "x") {
      // Copy / cut — read the selected text.
      const text = window.getSelection()?.toString() ?? "";
      if (ClipboardMonitor.exceedsThreshold(text)) {
        this.debouncedRecord();
      }
    } else {
      // Paste — try to read clipboard asynchronously.
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard
          .readText()
          .then((text) => {
            if (ClipboardMonitor.exceedsThreshold(text)) {
              this.debouncedRecord();
            }
          })
          .catch(() => {
            // Permission denied — can't inspect content; record defensively.
            this.debouncedRecord();
          });
      } else {
        // Clipboard API unavailable — record defensively.
        this.debouncedRecord();
      }
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
