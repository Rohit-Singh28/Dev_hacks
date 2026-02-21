/**
 * ScreenMonitor — Uses the device camera + TensorFlow.js Face Detection
 * (MediaPipe BlazeFace, open-source) to check if the user is physically
 * present in front of the screen.
 *
 * Detection strategy:
 *   1. Request camera permission via `getUserMedia`.
 *   2. Run face detection every ~1 s on the video stream.
 *   3. If no face is detected for `awayThresholdMs` (default 10 s)
 *      continuously, record a violation.
 *   4. When the face reappears, the "absent" timer resets.
 *
 * The violation counter is persisted in localStorage so a page refresh does
 * NOT reset progress toward termination.
 *
 * NOTE: TensorFlow.js and face-detection are loaded via dynamic import()
 * to avoid Turbopack / SSR errors with @mediapipe/face_detection.
 *
 * Flow:
 *   no face detected → 10 s timer starts
 *   face re-detected → timer cleared, no penalty
 *   timer fires      → onViolation() callback → caller shows warning
 *   violations ≥ max → onTerminate() callback → contest locked
 */

export interface ScreenMonitorConfig {
  /** Maximum violations before auto-termination (default: 3). */
  maxViolations: number;
  /** Time in ms without a face before a violation is recorded (default: 10000). */
  awayThresholdMs?: number;
  /** How often to run detection in ms (default: 1000). */
  detectionIntervalMs?: number;
  /** Unique key prefix for localStorage (scoped per contest). */
  contestId: string;
  /** Called on every violation with the current count. */
  onViolation: (count: number) => void;
  /** Called when maxViolations is reached or exceeded. */
  onTerminate: () => void;
  /** Called when the camera stream is ready. Receives the MediaStream. */
  onCameraReady?: (stream: MediaStream) => void;
  /** Called if camera access is denied or fails. */
  onCameraError?: (error: Error) => void;
  /** Called when face presence changes. */
  onFaceStatusChange?: (faceDetected: boolean) => void;
}

export class ScreenMonitor {
  private config: ScreenMonitorConfig;
  private storageKey: string;
  private awayThreshold: number;
  private detectionInterval: number;

  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private detector: any = null;
  private detectionTimer: ReturnType<typeof setInterval> | null = null;
  private awayTimer: ReturnType<typeof setTimeout> | null = null;

  private facePresent = true;
  private destroyed = false;
  private started = false;

  constructor(config: ScreenMonitorConfig) {
    this.config = config;
    this.awayThreshold = config.awayThresholdMs ?? 10_000;
    this.detectionInterval = config.detectionIntervalMs ?? 1_000;
    this.storageKey = `cm_screen_violations_${config.contestId}`;
  }

  // ── Public API ───────────────────────────────────────────────────

  /**
   * Initialise the camera, load the model, and start detection.
   * Returns a promise so the caller can `await` permission granting.
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

    try {
      // 1. Request camera access.
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      this.config.onCameraReady?.(this.stream);

      // 2. Create a hidden <video> element to pipe the stream into.
      this.videoEl = document.createElement("video");
      this.videoEl.srcObject = this.stream;
      this.videoEl.setAttribute("playsinline", "true");
      this.videoEl.muted = true;
      await this.videoEl.play();

      // 3. Dynamically import TF.js + face-detection to avoid SSR /
      //    Turbopack issues with the @mediapipe/face_detection shim.
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();

      const faceDetection = await import("@tensorflow-models/face-detection");

      // 4. Load MediaPipe BlazeFace Short-Range model (open-source, ~200 KB).
      this.detector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: "tfjs",
          maxFaces: 1,
        },
      );

      // 5. Start periodic detection loop.
      this.detectionTimer = setInterval(
        () => this.detect(),
        this.detectionInterval,
      );
    } catch (err) {
      console.error("[ScreenMonitor] Camera / model init failed:", err);
      this.config.onCameraError?.(
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  /** Stop monitoring, release camera, remove timers. */
  destroy(): void {
    this.destroyed = true;

    if (this.detectionTimer) {
      clearInterval(this.detectionTimer);
      this.detectionTimer = null;
    }
    this.clearAwayTimer();

    // Release camera tracks.
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    // Dispose TF model.
    if (this.detector) {
      this.detector.dispose();
      this.detector = null;
    }

    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl = null;
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

  // ── Internal ─────────────────────────────────────────────────────

  private async detect(): Promise<void> {
    if (this.destroyed || !this.detector || !this.videoEl) return;

    try {
      const faces = await this.detector.estimateFaces(this.videoEl);
      const detected = faces.length > 0;

      if (detected) {
        // Face is present — reset any running "away" timer.
        if (!this.facePresent) {
          this.facePresent = true;
          this.config.onFaceStatusChange?.(true);
        }
        this.clearAwayTimer();
      } else {
        // No face — start or continue the away timer.
        if (this.facePresent) {
          this.facePresent = false;
          this.config.onFaceStatusChange?.(false);
          this.startAwayTimer();
        }
      }
    } catch (err) {
      // Swallow detection errors (e.g. model busy) — skip this frame.
      console.warn("[ScreenMonitor] Detection frame error:", err);
    }
  }

  private startAwayTimer(): void {
    this.clearAwayTimer();
    this.awayTimer = setTimeout(() => {
      this.recordViolation();
      // Reset face state so a new 10 s window starts immediately.
      this.facePresent = true;
    }, this.awayThreshold);
  }

  private clearAwayTimer(): void {
    if (this.awayTimer !== null) {
      clearTimeout(this.awayTimer);
      this.awayTimer = null;
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
