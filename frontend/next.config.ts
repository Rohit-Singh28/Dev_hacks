import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack: alias @mediapipe/face_detection to a stub so that
  // @tensorflow-models/face-detection's top-level import resolves.
  // We only use the "tfjs" runtime, so the mediapipe path is never called.
  turbopack: {
    resolveAlias: {
      "@mediapipe/face_detection": "./lib/stubs/mediapipe-face-detection.js",
    },
  },

  // Same alias for production builds (webpack).
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@mediapipe/face_detection": path.resolve(
        __dirname,
        "lib/stubs/mediapipe-face-detection.js",
      ),
    };
    return config;
  },
};

export default nextConfig;
