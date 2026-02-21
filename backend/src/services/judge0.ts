import axios, { AxiosInstance } from "axios";
import { config } from "../config";

/**
 * Judge0 CE API client (Plain Text Mode).
 */

export interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}

export interface Judge0Result {
  token: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
}

// Judge0 status IDs
export const JUDGE0_STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
} as const;

export function isRuntimeError(statusId: number): boolean {
  return statusId >= 7 && statusId <= 12;
}

class Judge0Service {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.judge0.apiUrl,
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": config.judge0.apiKey,
        "X-RapidAPI-Host": new URL(config.judge0.apiUrl).hostname,
      },
      timeout: 30000,
    });
  }

  /**
   * Submit batch executions (max 20 per request).
   */
  async submitBatch(
    submissions: Judge0Submission[],
  ): Promise<{ token: string }[]> {
    const BATCH_SIZE = 20;
    const allTokens: { token: string }[] = [];

    for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
      const batch = submissions.slice(i, i + BATCH_SIZE);

      const { data } = await this.client.post("/submissions/batch", {
        submissions: batch.map((s) => ({
          ...s,
          base64_encoded: false,
        })),
      });

      allTokens.push(...data);
    }

    return allTokens;
  }

  /**
   * Poll Judge0 until results are ready.
   */
  async pollBatchResults(
    tokens: string[],
    maxWaitMs = 60000,
  ): Promise<Judge0Result[]> {
    const start = Date.now();

    // Brief initial wait for Judge0 to start processing
    await this.sleep(500);

    let delay = 500;

    while (Date.now() - start < maxWaitMs) {
      const { data } = await this.client.get("/submissions/batch", {
        params: {
          tokens: tokens.join(","),
          base64_encoded: false,
          fields:
            "token,stdout,stderr,compile_output,message,status,time,memory",
        },
      });

      const results: Judge0Result[] = data.submissions;

      const allDone = results.every(
        (r) =>
          r.status.id !== JUDGE0_STATUS.IN_QUEUE &&
          r.status.id !== JUDGE0_STATUS.PROCESSING,
      );

      if (allDone) {
        return results;
      }

      await this.sleep(delay);

      // Exponential backoff capped at 2s
      delay = Math.min(delay * 1.5, 2000);
    }

    throw new Error("Judge0 polling timed out");
  }

  /**
   * Convenience helper for single execution.
   */
  async submitAndWait(submission: Judge0Submission): Promise<Judge0Result> {
    const [{ token }] = await this.submitBatch([submission]);
    const [result] = await this.pollBatchResults([token]);
    return result;
  }

  /**
   * Utility sleep helper.
   */
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const judge0Service = new Judge0Service();
