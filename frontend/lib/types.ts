// ─── API Types ─────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  rating: number;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  timeLimit: number;
  memoryLimit: number;
  sampleInput?: string;
  sampleOutput?: string;
  constraints?: string;
  testCases: VisibleTestCase[];
  _count?: { submissions: number };
}

export interface VisibleTestCase {
  id: string;
  input: string;
  output: string;
  orderIndex: number;
}

export type Language = "CPP" | "PYTHON" | "JAVA";

export type Verdict =
  | "PENDING"
  | "RUNNING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "COMPILATION_ERROR";

export interface Submission {
  id: string;
  language: Language;
  verdict: Verdict;
  executionTime?: number;
  memoryUsed?: number;
  testsPassed: number;
  testsTotal: number;
  compileOutput?: string;
  stderr?: string;
  createdAt: string;
  problem?: { title: string; slug: string };
}

export interface Contest {
  id: string;
  title: string;
  slug: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: "UPCOMING" | "ACTIVE" | "ENDED";
  contestProblems: ContestProblem[];
  _count?: { contestParticipants: number; contestProblems: number };
}

export interface ContestProblem {
  id: string;
  label: string;
  points: number;
  orderIdx: number;
  problem: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
  };
}

export interface ScoreboardRow {
  rank: number;
  user: { id: string; username: string; rating: number };
  score: number;
  penalty: number;
  solvedProblems: { label: string; problemId: string; solved: boolean }[];
}

export interface TestCaseResult {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  passed: boolean;
  statusDescription: string;
  time: string | null;
  memory: number | null;
  isHidden: boolean;
}

export interface SubmissionUpdate {
  submissionId: string;
  verdict: Verdict;
  testsPassed?: number;
  testsTotal?: number;
  executionTime?: number;
  memoryUsed?: number;
  compileOutput?: string;
  testResults?: TestCaseResult[];
}
