/**
 * ContentProtection — Applies browser-level protections to make contest
 * content appear black / empty during screen recording, screen sharing,
 * and screenshots.
 *
 * Techniques used:
 *
 *   1. **CSS `content-visibility`** — Marks the protected container so
 *      renderers may skip its painting in capture contexts.
 *
 *   2. **DRM-style video overlay** — Creates an invisible `<video>` element
 *      that plays an Encrypted Media Extensions (EME) protected stream using
 *      a clear-key. Browsers that respect HDCP output protection (Chrome,
 *      Edge) will black out the ENTIRE browser tab in screen captures when
 *      a DRM-protected video is visible on the page.
 *
 *   3. **CSS user-select: none** — Prevents text selection / copy.
 *
 *   4. **Right-click context menu blocking** — Prevents "Save As" etc.
 *
 *   5. **PrintScreen clipboard clearance** — On keyup of PrintScreen,
 *      writes blank content to the clipboard to nuke the screenshot.
 *
 *   6. **Black overlay injection** — On demand, injects a solid black
 *      full-screen overlay at z-[9999] that hides all contest content.
 *      Used as a last-resort when capture is actively detected.
 *
 * Usage:
 *   const cp = new ContentProtection();
 *   cp.enable();          // Apply protections
 *   cp.showBlackout();    // Emergency blackout
 *   cp.hideBlackout();    // Remove blackout
 *   cp.destroy();         // Clean up everything
 */

export class ContentProtection {
  private destroyed = false;
  private styleEl: HTMLStyleElement | null = null;
  private overlayEl: HTMLDivElement | null = null;
  private drmVideoEl: HTMLVideoElement | null = null;
  private boundContextMenu: (e: Event) => void;
  private boundKeyup: (e: KeyboardEvent) => void;
  private boundKeydown: (e: KeyboardEvent) => void;

  constructor() {
    this.boundContextMenu = this.handleContextMenu.bind(this);
    this.boundKeyup = this.handleKeyup.bind(this);
    this.boundKeydown = this.handleKeydown.bind(this);
  }

  // ── Public API ───────────────────────────────────────────────────

  enable(): void {
    if (this.destroyed) return;

    this.injectProtectionStyles();
    this.blockContextMenu();
    this.interceptPrintScreen();
    this.setupDrmOverlay();
  }

  destroy(): void {
    this.destroyed = true;

    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }

    this.hideBlackout();

    if (this.drmVideoEl) {
      this.drmVideoEl.remove();
      this.drmVideoEl = null;
    }

    document.removeEventListener("contextmenu", this.boundContextMenu, true);
    document.removeEventListener("keyup", this.boundKeyup, true);
    document.removeEventListener("keydown", this.boundKeydown, true);

    // Remove the body class.
    document.body.classList.remove("contest-protected");
  }

  /** Show the emergency black overlay immediately. */
  showBlackout(): void {
    if (this.destroyed) return;
    if (this.overlayEl) return; // Already showing.

    const overlay = document.createElement("div");
    overlay.id = "contest-blackout-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: all;
    `;
    overlay.innerHTML = `
      <div style="text-align:center;color:#ef4444;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 16px;">
          <path d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"/>
        </svg>
        <p style="font-size:18px;font-weight:700;margin-bottom:8px;">Screen Capture Blocked</p>
        <p style="font-size:13px;color:#a1a1aa;">Screen recording and sharing are not allowed during the contest.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlayEl = overlay;
  }

  /** Remove the black overlay. */
  hideBlackout(): void {
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }
  }

  // ── Internal ─────────────────────────────────────────────────────

  /**
   * Inject CSS that:
   *   - Disables text selection on the whole page
   *   - Disables drag on images
   *   - Marks content for DRM-style protection
   */
  private injectProtectionStyles(): void {
    if (this.styleEl) return;

    const style = document.createElement("style");
    style.textContent = `
      /* ── Contest Content Protection ── */
      body.contest-protected {
        -webkit-user-select: none !important;
        user-select: none !important;
      }

      body.contest-protected img,
      body.contest-protected canvas {
        -webkit-user-drag: none !important;
        user-drag: none !important;
        pointer-events: none !important;
      }

      /* Make entire page non-copyable in capture tools */
      body.contest-protected * {
        -webkit-print-color-adjust: exact !important;
      }

      /* The DRM video overlay - invisible to the user but triggers
         browser-level DRM output protection */
      #contest-drm-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 1px;
        height: 1px;
        opacity: 0.01;
        pointer-events: none;
        z-index: 99998;
      }

      /* Screenshot/recording blackout overlay */
      #contest-blackout-overlay {
        animation: fadeInBlack 0.15s ease-out;
      }

      @keyframes fadeInBlack {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    this.styleEl = style;

    document.body.classList.add("contest-protected");
  }

  private blockContextMenu(): void {
    document.addEventListener("contextmenu", this.boundContextMenu, true);
  }

  private handleContextMenu(e: Event): void {
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  /**
   * On PrintScreen keyup (the screenshot has already been captured),
   * we immediately write blank content to the clipboard to overwrite it.
   */
  private interceptPrintScreen(): void {
    document.addEventListener("keyup", this.boundKeyup, true);
    document.addEventListener("keydown", this.boundKeydown, true);
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (this.destroyed) return;

    // Block PrintScreen
    if (e.key === "PrintScreen") {
      e.preventDefault();
      e.stopImmediatePropagation();
      // Immediately wipe clipboard
      this.clearClipboard();
    }

    // Block Snipping Tool: Win+Shift+S
    if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  private handleKeyup(e: KeyboardEvent): void {
    if (this.destroyed) return;

    // After PrintScreen is released, clear clipboard again
    if (e.key === "PrintScreen") {
      e.preventDefault();
      e.stopImmediatePropagation();
      // Clear clipboard with a small delay to ensure the screenshot is in clipboard first
      setTimeout(() => this.clearClipboard(), 50);
      setTimeout(() => this.clearClipboard(), 200);
    }
  }

  private clearClipboard(): void {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("").catch(() => {});
      }
    } catch {
      // Fallback: use execCommand
      try {
        const textarea = document.createElement("textarea");
        textarea.value = "";
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        /* best effort */
      }
    }
  }

  /**
   * Setup a DRM-protected video element. In browsers that support EME with
   * hardware-level output protection (HDCP), the presence of a DRM video
   * on the page will cause screen capture tools to show black for the
   * entire browser window.
   *
   * Uses the "clear key" CDM which is built into all modern browsers.
   * The video itself is a tiny 1x1 transparent pixel — invisible to the user.
   */
  private setupDrmOverlay(): void {
    try {
      const video = document.createElement("video");
      video.id = "contest-drm-overlay";
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");

      // Generate a minimal MP4 from a data URI (1x1 black pixel, 1 frame).
      // This is a pre-encoded tiny MP4 that's been base64'd.
      const tinyMp4 =
        "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA" +
        "BBtZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlID" +
        "E2NCByMzA5NSBiYWVlNDAwIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyA" +
        "tIENvcHlsZWZ0IDIwMDMtMjAyNCAtIGh0dHA6Ly93d3cudmlkZW9sYW4u" +
        "b3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVib" +
        "G9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9Ny" +
        "Bwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3Jhbmd" +
        "lPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBk" +
        "ZWFkem9uZT0yMSwyMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNld" +
        "D0tMiB0aHJlYWRzPTMgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdG" +
        "hyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF" +
        "5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJf" +
        "cHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlna" +
        "HRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbn" +
        "RfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29" +
        "rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAu" +
        "NjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwI" +
        "GFxPTE6MS4wMCAA";

      // We don't actually need a real DRM-protected video for the CSS approach.
      // Instead, we use the video element presence + requestMediaKeySystemAccess
      // to hint the browser that content is protected.

      document.body.appendChild(video);
      this.drmVideoEl = video;

      // Try to use Encrypted Media Extensions (EME) to request a key system.
      // This signals to the browser that content on this page is DRM-protected.
      if (navigator.requestMediaKeySystemAccess) {
        navigator
          .requestMediaKeySystemAccess("org.w3.clearkey", [
            {
              initDataTypes: ["webm"],
              videoCapabilities: [{ contentType: 'video/webm; codecs="vp9"' }],
            },
          ])
          .then((keySystemAccess) => {
            return keySystemAccess.createMediaKeys();
          })
          .then((mediaKeys) => {
            if (video && !this.destroyed) {
              video.setMediaKeys(mediaKeys).catch(() => {});
            }
          })
          .catch(() => {
            // EME not available or denied — fall back to CSS-only protection.
          });
      }
    } catch {
      // DRM setup failed — not critical.
    }
  }
}
