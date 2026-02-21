/**
 * Barrel export for the monitoring subsystem.
 *
 * Usage:
 *   import { TabMonitor, ClipboardMonitor, terminateContest } from "@/lib/monitoring";
 */

export { TabMonitor } from "./tabMonitor";
export type { TabMonitorConfig } from "./tabMonitor";

export { ClipboardMonitor } from "./clipboardMonitor";
export type { ClipboardMonitorConfig } from "./clipboardMonitor";

export { ScreenMonitor } from "./screenMonitor";
export type { ScreenMonitorConfig } from "./screenMonitor";

export {
  terminateContest,
  isContestTerminated,
  getTerminationReason,
  clearMonitoringData,
} from "./contestTermination";
export type { TerminationReason } from "./contestTermination";
