"use client";

/**
 * WarningDialog — Full-screen modal overlay for monitoring warnings.
 *
 * Two visual modes:
 *   • "warning"  — amber/yellow banner with a dismiss button.
 *   • "terminated" — red banner with no dismiss option (locks UI).
 *
 * Always renders on top of everything (z-50) with a translucent backdrop
 * to block interaction with the underlying contest page.
 */

interface WarningDialogProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Visual severity — determines colour scheme and whether dismissal is allowed. */
  type: "warning" | "terminated";
  /** Primary heading text. */
  title: string;
  /** Descriptive body text. */
  message: string;
  /** Called when the user acknowledges a warning. Ignored for "terminated". */
  onDismiss?: () => void;
}

export default function WarningDialog({
  open,
  type,
  title,
  message,
  onDismiss,
}: WarningDialogProps) {
  if (!open) return null;

  const isTerminated = type === "terminated";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={`
          mx-4 w-full max-w-md rounded-xl border p-6 shadow-2xl
          ${
            isTerminated
              ? "border-red-800 bg-zinc-950"
              : "border-amber-700 bg-zinc-950"
          }
        `}
      >
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          {isTerminated ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-900/40">
              <svg
                className="h-7 w-7 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-900/40">
              <svg
                className="h-7 w-7 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <h2
          className={`mb-2 text-center text-lg font-bold ${
            isTerminated ? "text-red-400" : "text-amber-400"
          }`}
        >
          {title}
        </h2>

        {/* Message */}
        <p className="mb-6 text-center text-sm leading-relaxed text-zinc-400">
          {message}
        </p>

        {/* Action */}
        {!isTerminated && onDismiss && (
          <button
            onClick={onDismiss}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            I Understand — Continue
          </button>
        )}

        {isTerminated && (
          <p className="text-center text-xs text-zinc-600">
            You will be redirected shortly…
          </p>
        )}
      </div>
    </div>
  );
}
