import type { Language, Verdict } from "./types";

export const LANGUAGE_OPTIONS: { value: Language; label: string; id: number }[] = [
  { value: "CPP", label: "C++ (GCC 9.2)", id: 54 },
  { value: "PYTHON", label: "Python (3.8)", id: 71 },
  { value: "JAVA", label: "Java (OpenJDK 13)", id: 62 },
];

export const LANGUAGE_DEFAULTS: Record<Language, string> = {
  CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Your code here
    
    return 0;
}`,
  PYTHON: `# Your code here
`,
  JAVA: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Your code here
        
    }
}`,
};

export const MONACO_LANGUAGE_MAP: Record<Language, string> = {
  CPP: "cpp",
  PYTHON: "python",
  JAVA: "java",
};

export const VERDICT_COLORS: Record<Verdict, string> = {
  PENDING: "text-gray-400",
  RUNNING: "text-yellow-400",
  ACCEPTED: "text-green-500",
  WRONG_ANSWER: "text-red-500",
  TIME_LIMIT_EXCEEDED: "text-orange-500",
  MEMORY_LIMIT_EXCEEDED: "text-orange-500",
  RUNTIME_ERROR: "text-purple-500",
  COMPILATION_ERROR: "text-red-400",
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  PENDING: "Pending",
  RUNNING: "Running...",
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong Answer",
  TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
  MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
  RUNTIME_ERROR: "Runtime Error",
  COMPILATION_ERROR: "Compilation Error",
};

export const DIFFICULTY_COLORS = {
  EASY: "text-green-500",
  MEDIUM: "text-yellow-500",
  HARD: "text-red-500",
};
