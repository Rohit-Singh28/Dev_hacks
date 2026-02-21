/**
 * Stub for @mediapipe/face_detection.
 *
 * The @tensorflow-models/face-detection ESM bundle unconditionally imports
 * `FaceDetection` from "@mediapipe/face_detection" at the top level, even
 * though the tfjs runtime never uses it. Turbopack cannot tree-shake the
 * import, so we alias it to this empty stub via next.config.ts.
 *
 * This class is never instantiated — our ScreenMonitor uses runtime: "tfjs".
 */

export class FaceDetection {
  constructor() {}
  setOptions() {}
  onResults() {}
  send() {
    return Promise.resolve();
  }
  initialize() {
    return Promise.resolve();
  }
  close() {}
  reset() {}
}
