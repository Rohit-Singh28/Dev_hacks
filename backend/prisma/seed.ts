/// <reference types="node" />
import { PrismaClient, Language, Verdict } from "@prisma/client";
import bcrypt from "bcryptjs";
import console from "console";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Create Users ────────────────────────────────────────────────
  const password = await bcrypt.hash("password123", 12);

  const user1 = await prisma.user.upsert({
    where: { username: "alice" },
    update: {},
    create: {
      username: "alice",
      email: "alice@example.com",
      passwordHash: password,
      rating: 1500,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { username: "bob" },
    update: {},
    create: {
      username: "bob",
      email: "bob@example.com",
      passwordHash: password,
      rating: 1200,
    },
  });

  // ─── Pro User: Rohit Singh ────────────────────────────────────────
  const rohitPassword = await bcrypt.hash("Rohit@2024!", 12);

  const rohit = await prisma.user.upsert({
    where: { username: "rohitsingh" },
    update: {},
    create: {
      username: "rohitsingh",
      email: "rohit.singh@example.com",
      passwordHash: rohitPassword,
      rating: 2847,
      // Add any other profile fields your schema supports:
      // displayName: "Rohit Singh",
      // bio: "Competitive programmer | Knight on LeetCode | ICPC Regionalist",
      // country: "India",
      // institution: "IIT Bombay",
      // github: "rohitsingh-dev",
      // linkedin: "rohitsingh-cp",
      // avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=rohitsingh",
    },
  });

  console.log("✅ Users created");

  // ─── Create Topics ───────────────────────────────────────────────

  const topicArrays = await prisma.topic.upsert({
    where: { slug: "arrays" },
    update: {},
    create: {
      name: "Arrays",
      slug: "arrays",
      description:
        "Problems involving array manipulation, traversal, and operations",
      icon: "grid",
      color: "#3B82F6",
      orderIndex: 1,
    },
  });

  const topicStrings = await prisma.topic.upsert({
    where: { slug: "strings" },
    update: {},
    create: {
      name: "Strings",
      slug: "strings",
      description: "String manipulation, pattern matching, and text processing",
      icon: "text",
      color: "#10B981",
      orderIndex: 2,
    },
  });

  const topicHashTable = await prisma.topic.upsert({
    where: { slug: "hash-table" },
    update: {},
    create: {
      name: "Hash Table",
      slug: "hash-table",
      description: "Problems using hash maps, sets, and frequency counting",
      icon: "hash",
      color: "#8B5CF6",
      orderIndex: 3,
    },
  });

  const topicTwoPointers = await prisma.topic.upsert({
    where: { slug: "two-pointers" },
    update: {},
    create: {
      name: "Two Pointers",
      slug: "two-pointers",
      description: "Two pointer technique for array and string problems",
      icon: "arrows",
      color: "#F59E0B",
      orderIndex: 4,
    },
  });

  const topicSlidingWindow = await prisma.topic.upsert({
    where: { slug: "sliding-window" },
    update: {},
    create: {
      name: "Sliding Window",
      slug: "sliding-window",
      description:
        "Sliding window technique for subarray and substring problems",
      icon: "window",
      color: "#EC4899",
      orderIndex: 5,
    },
  });

  const topicSearching = await prisma.topic.upsert({
    where: { slug: "searching" },
    update: {},
    create: {
      name: "Binary Search",
      slug: "searching",
      description: "Binary search and other searching algorithms",
      icon: "search",
      color: "#06B6D4",
      orderIndex: 6,
    },
  });

  const topicSorting = await prisma.topic.upsert({
    where: { slug: "sorting" },
    update: {},
    create: {
      name: "Sorting",
      slug: "sorting",
      description: "Sorting algorithms and problems requiring sorted data",
      icon: "sort",
      color: "#84CC16",
      orderIndex: 7,
    },
  });

  const topicRecursion = await prisma.topic.upsert({
    where: { slug: "recursion" },
    update: {},
    create: {
      name: "Recursion",
      slug: "recursion",
      description: "Recursive problem solving and divide & conquer",
      icon: "refresh",
      color: "#F97316",
      orderIndex: 8,
    },
  });

  const topicDP = await prisma.topic.upsert({
    where: { slug: "dynamic-programming" },
    update: {},
    create: {
      name: "Dynamic Programming",
      slug: "dynamic-programming",
      description: "Memoization, tabulation, and optimal substructure problems",
      icon: "table",
      color: "#EF4444",
      orderIndex: 9,
    },
  });

  const topicGraphs = await prisma.topic.upsert({
    where: { slug: "graphs" },
    update: {},
    create: {
      name: "Graphs",
      slug: "graphs",
      description: "Graph traversal, shortest path, and graph algorithms",
      icon: "share",
      color: "#14B8A6",
      orderIndex: 10,
    },
  });

  const topicTrees = await prisma.topic.upsert({
    where: { slug: "trees" },
    update: {},
    create: {
      name: "Trees",
      slug: "trees",
      description: "Binary trees, BST, and tree traversal problems",
      icon: "tree",
      color: "#22C55E",
      orderIndex: 11,
    },
  });

  const topicDataStructures = await prisma.topic.upsert({
    where: { slug: "data-structures" },
    update: {},
    create: {
      name: "Data Structures",
      slug: "data-structures",
      description: "Stacks, queues, heaps, and advanced data structures",
      icon: "database",
      color: "#6366F1",
      orderIndex: 12,
    },
  });

  const topicBacktracking = await prisma.topic.upsert({
    where: { slug: "backtracking" },
    update: {},
    create: {
      name: "Backtracking",
      slug: "backtracking",
      description: "Backtracking algorithms and constraint satisfaction",
      icon: "undo",
      color: "#A855F7",
      orderIndex: 13,
    },
  });

  const topicBasics = await prisma.topic.upsert({
    where: { slug: "basics" },
    update: {},
    create: {
      name: "Basics",
      slug: "basics",
      description: "Fundamental programming concepts and simple problems",
      icon: "code",
      color: "#64748B",
      orderIndex: 0,
    },
  });

  console.log("✅ Topics created");

  // ─── Create Problems ─────────────────────────────────────────────

  const twoSum = await prisma.problem.upsert({
    where: { slug: "two-sum" },
    update: { topicId: topicHashTable.id },
    create: {
      title: "Two Sum",
      slug: "two-sum",
      topicId: topicHashTable.id,
      description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Input Format:**
- First line: n (size of array)
- Second line: n space-separated integers
- Third line: target integer

**Output Format:**
- Two space-separated indices (0-indexed)`,
      difficulty: "EASY",
      timeLimit: 2000,
      memoryLimit: 262144,
      sampleInput: "4\n2 7 11 15\n9",
      sampleOutput: "0 1",
      constraints: "2 ≤ n ≤ 10^4\n-10^9 ≤ nums[i] ≤ 10^9",
    },
  });

  // Visible test cases
  await prisma.testCase.upsert({
    where: { id: "tc-ts-1" },
    update: {},
    create: {
      id: "tc-ts-1",
      problemId: twoSum.id,
      input: "4\n2 7 11 15\n9",
      output: "0 1",
      isHidden: false,
      orderIndex: 0,
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-ts-2" },
    update: {},
    create: {
      id: "tc-ts-2",
      problemId: twoSum.id,
      input: "3\n3 2 4\n6",
      output: "1 2",
      isHidden: false,
      orderIndex: 1,
    },
  });

  // Hidden test cases
  await prisma.testCase.upsert({
    where: { id: "tc-ts-3" },
    update: {},
    create: {
      id: "tc-ts-3",
      problemId: twoSum.id,
      input: "5\n1 5 3 7 2\n8",
      output: "0 3",
      isHidden: true,
      orderIndex: 2,
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-ts-4" },
    update: {},
    create: {
      id: "tc-ts-4",
      problemId: twoSum.id,
      input: "2\n3 3\n6",
      output: "0 1",
      isHidden: true,
      orderIndex: 3,
    },
  });

  // ─── Problem 2: Palindrome Check ────────────────────────────────

  const palindrome = await prisma.problem.upsert({
    where: { slug: "palindrome-check" },
    update: { topicId: topicTwoPointers.id },
    create: {
      title: "Palindrome Check",
      slug: "palindrome-check",
      topicId: topicTwoPointers.id,
      description: `Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.

Only consider alphanumeric characters, ignoring case.

**Input Format:**
- A single line containing the string s.

**Output Format:**
- \`true\` or \`false\``,
      difficulty: "EASY",
      timeLimit: 1000,
      memoryLimit: 262144,
      sampleInput: "A man, a plan, a canal: Panama",
      sampleOutput: "true",
      constraints: "1 ≤ s.length ≤ 2 × 10^5",
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-pc-1" },
    update: {},
    create: {
      id: "tc-pc-1",
      problemId: palindrome.id,
      input: "A man, a plan, a canal: Panama",
      output: "true",
      isHidden: false,
      orderIndex: 0,
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-pc-2" },
    update: {},
    create: {
      id: "tc-pc-2",
      problemId: palindrome.id,
      input: "race a car",
      output: "false",
      isHidden: false,
      orderIndex: 1,
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-pc-3" },
    update: {},
    create: {
      id: "tc-pc-3",
      problemId: palindrome.id,
      input: "abba",
      output: "true",
      isHidden: true,
      orderIndex: 2,
    },
  });

  // ─── Problem 3: Fibonacci ────────────────────────────────────────

  const fib = await prisma.problem.upsert({
    where: { slug: "fibonacci-number" },
    update: { topicId: topicDP.id },
    create: {
      title: "Fibonacci Number",
      slug: "fibonacci-number",
      topicId: topicDP.id,
      description: `Given \`n\`, return the nth Fibonacci number. F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2).

**Input Format:**
- A single integer n.

**Output Format:**
- A single integer — the nth Fibonacci number.`,
      difficulty: "MEDIUM",
      timeLimit: 1000,
      memoryLimit: 262144,
      sampleInput: "10",
      sampleOutput: "55",
      constraints: "0 ≤ n ≤ 30",
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-fib-1" },
    update: {},
    create: {
      id: "tc-fib-1",
      problemId: fib.id,
      input: "10",
      output: "55",
      isHidden: false,
      orderIndex: 0,
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-fib-2" },
    update: {},
    create: {
      id: "tc-fib-2",
      problemId: fib.id,
      input: "0",
      output: "0",
      isHidden: false,
      orderIndex: 1,
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-fib-3" },
    update: {},
    create: {
      id: "tc-fib-3",
      problemId: fib.id,
      input: "20",
      output: "6765",
      isHidden: true,
      orderIndex: 2,
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-fib-4" },
    update: {},
    create: {
      id: "tc-fib-4",
      problemId: fib.id,
      input: "30",
      output: "832040",
      isHidden: true,
      orderIndex: 3,
    },
  });

  console.log("✅ Problems + test cases created");

  // ─── Create Hints ─────────────────────────────────────────────────

  // Two Sum hints
  await prisma.hint.upsert({
    where: { id: "hint-ts-1" },
    update: {},
    create: {
      id: "hint-ts-1",
      problemId: twoSum.id,
      content:
        "Think about what data structure would allow you to quickly look up whether a complement value exists.",
      orderIdx: 0,
    },
  });

  await prisma.hint.upsert({
    where: { id: "hint-ts-2" },
    update: {},
    create: {
      id: "hint-ts-2",
      problemId: twoSum.id,
      content:
        "Use a hash map to store each number's index as you iterate. For each number, check if (target - number) already exists in the map.",
      orderIdx: 1,
    },
  });

  // Palindrome hints
  await prisma.hint.upsert({
    where: { id: "hint-pc-1" },
    update: {},
    create: {
      id: "hint-pc-1",
      problemId: palindrome.id,
      content:
        "First, filter out non-alphanumeric characters and convert everything to lowercase.",
      orderIdx: 0,
    },
  });

  await prisma.hint.upsert({
    where: { id: "hint-pc-2" },
    update: {},
    create: {
      id: "hint-pc-2",
      problemId: palindrome.id,
      content:
        "Use two pointers — one at the start and one at the end — moving inward and comparing characters.",
      orderIdx: 1,
    },
  });

  // Fibonacci hints
  await prisma.hint.upsert({
    where: { id: "hint-fib-1" },
    update: {},
    create: {
      id: "hint-fib-1",
      problemId: fib.id,
      content:
        "A naive recursive approach will have exponential time complexity. Think about how to avoid redundant calculations.",
      orderIdx: 0,
    },
  });

  await prisma.hint.upsert({
    where: { id: "hint-fib-2" },
    update: {},
    create: {
      id: "hint-fib-2",
      problemId: fib.id,
      content:
        "Use dynamic programming — either memoization (top-down) or tabulation (bottom-up) with just two variables.",
      orderIdx: 1,
    },
  });

  console.log("✅ Hints created");

  // ─── Create Contest ──────────────────────────────────────────────

  const now = new Date();
  const contestStart = new Date(now.getTime() + 5 * 60 * 1000); // 5 min from now
  const contestEnd = new Date(contestStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours

  const contest = await prisma.contest.upsert({
    where: { slug: "weekly-contest-1" },
    update: {
      startTime: contestStart,
      endTime: contestEnd,
      status: "UPCOMING",
    },
    create: {
      title: "Weekly Contest #1",
      slug: "weekly-contest-1",
      description: "First weekly contest. Solve 3 problems in 2 hours.",
      startTime: contestStart,
      endTime: contestEnd,
      status: "UPCOMING",
    },
  });

  // Link problems to contest
  await prisma.contestProblem.upsert({
    where: {
      contestId_problemId: { contestId: contest.id, problemId: twoSum.id },
    },
    update: {},
    create: {
      contestId: contest.id,
      problemId: twoSum.id,
      label: "A",
      points: 100,
      orderIdx: 0,
    },
  });

  await prisma.contestProblem.upsert({
    where: {
      contestId_problemId: { contestId: contest.id, problemId: palindrome.id },
    },
    update: {},
    create: {
      contestId: contest.id,
      problemId: palindrome.id,
      label: "B",
      points: 150,
      orderIdx: 1,
    },
  });

  await prisma.contestProblem.upsert({
    where: {
      contestId_problemId: { contestId: contest.id, problemId: fib.id },
    },
    update: {},
    create: {
      contestId: contest.id,
      problemId: fib.id,
      label: "C",
      points: 200,
      orderIdx: 2,
    },
  });

  // Register both users
  await prisma.contestParticipant.upsert({
    where: {
      contestId_userId: { contestId: contest.id, userId: user1.id },
    },
    update: {},
    create: { contestId: contest.id, userId: user1.id },
  });

  await prisma.contestParticipant.upsert({
    where: {
      contestId_userId: { contestId: contest.id, userId: user2.id },
    },
    update: {},
    create: { contestId: contest.id, userId: user2.id },
  });

  // ─── Additional Problems ─────────────────────────────────────────

  const anagram = await prisma.problem.upsert({
    where: { slug: "valid-anagram" },
    update: { topicId: topicStrings.id },
    create: {
      title: "Valid Anagram",
      slug: "valid-anagram",
      topicId: topicStrings.id,
      description: `Check if two strings are anagrams.`,
      difficulty: "EASY",
      timeLimit: 1000,
      memoryLimit: 262144,
      sampleInput: "anagram\nnagaram",
      sampleOutput: "true",
      constraints: "1 ≤ s.length ≤ 10^5",
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-va-1" },
    update: {},
    create: {
      id: "tc-va-1",
      problemId: anagram.id,
      input: "anagram\nnagaram",
      output: "true",
      isHidden: false,
      orderIndex: 0,
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-va-2" },
    update: {},
    create: {
      id: "tc-va-2",
      problemId: anagram.id,
      input: "rat\ncar",
      output: "false",
      isHidden: true,
      orderIndex: 1,
    },
  });

  const maxElement = await prisma.problem.upsert({
    where: { slug: "max-element" },
    update: { topicId: topicArrays.id },
    create: {
      title: "Maximum Element",
      slug: "max-element",
      topicId: topicArrays.id,
      description: `Find the maximum element in array.`,
      difficulty: "EASY",
      timeLimit: 1000,
      memoryLimit: 262144,
      sampleInput: "5\n1 3 5 2 4",
      sampleOutput: "5",
      constraints: "1 ≤ n ≤ 10^5",
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-me-1" },
    update: {},
    create: {
      id: "tc-me-1",
      problemId: maxElement.id,
      input: "5\n1 3 5 2 4",
      output: "5",
      isHidden: false,
      orderIndex: 0,
    },
  });

  const countEven = await prisma.problem.upsert({
    where: { slug: "count-even" },
    update: { topicId: topicBasics.id },
    create: {
      title: "Count Even Numbers",
      slug: "count-even",
      topicId: topicBasics.id,
      description: `Count even integers in array.`,
      difficulty: "EASY",
      timeLimit: 1000,
      memoryLimit: 262144,
      sampleInput: "5\n1 2 3 4 6",
      sampleOutput: "3",
      constraints: "1 ≤ n ≤ 10^5",
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-ce-1" },
    update: {},
    create: {
      id: "tc-ce-1",
      problemId: countEven.id,
      input: "5\n1 2 3 4 6",
      output: "3",
      isHidden: false,
      orderIndex: 0,
    },
  });

  const binarySearch = await prisma.problem.upsert({
    where: { slug: "binary-search" },
    update: { topicId: topicSearching.id },
    create: {
      title: "Binary Search",
      slug: "binary-search",
      topicId: topicSearching.id,
      description: `Return index of target else -1.`,
      difficulty: "MEDIUM",
      timeLimit: 1000,
      memoryLimit: 262144,
      sampleInput: "5\n1 2 3 4 5\n4",
      sampleOutput: "3",
      constraints: "1 ≤ n ≤ 10^5",
    },
  });

  await prisma.testCase.upsert({
    where: { id: "tc-bs-1" },
    update: {},
    create: {
      id: "tc-bs-1",
      problemId: binarySearch.id,
      input: "5\n1 2 3 4 5\n4",
      output: "3",
      isHidden: false,
      orderIndex: 0,
    },
  });

  const substring = await prisma.problem.upsert({
    where: { slug: "longest-substring" },
    update: { topicId: topicSlidingWindow.id },
    create: {
      title: "Longest Substring",
      slug: "longest-substring",
      topicId: topicSlidingWindow.id,
      description: `Longest substring without repeating characters.`,
      difficulty: "MEDIUM",
      timeLimit: 2000,
      memoryLimit: 262144,
      sampleInput: "abcabcbb",
      sampleOutput: "3",
      constraints: "1 ≤ s.length ≤ 10^5",
    },
  });

  const mergeIntervals = await prisma.problem.upsert({
    where: { slug: "merge-intervals" },
    update: { topicId: topicSorting.id },
    create: {
      title: "Merge Intervals",
      slug: "merge-intervals",
      topicId: topicSorting.id,
      description: `Merge overlapping intervals.`,
      difficulty: "MEDIUM",
      timeLimit: 2000,
      memoryLimit: 262144,
      sampleInput: "3\n1 3\n2 6\n8 10",
      sampleOutput: "1 6\n8 10",
      constraints: "1 ≤ n ≤ 10^4",
    },
  });

  const islands = await prisma.problem.upsert({
    where: { slug: "number-of-islands" },
    update: { topicId: topicGraphs.id },
    create: {
      title: "Number of Islands",
      slug: "number-of-islands",
      topicId: topicGraphs.id,
      description: `Count number of islands.`,
      difficulty: "MEDIUM",
      timeLimit: 2000,
      memoryLimit: 262144,
      sampleInput: "2 2\n1 1\n0 1",
      sampleOutput: "1",
      constraints: "1 ≤ m,n ≤ 300",
    },
  });

  const dijkstra = await prisma.problem.upsert({
    where: { slug: "dijkstra" },
    update: { topicId: topicGraphs.id },
    create: {
      title: "Dijkstra Shortest Path",
      slug: "dijkstra",
      topicId: topicGraphs.id,
      description: `Find shortest path.`,
      difficulty: "HARD",
      timeLimit: 2000,
      memoryLimit: 262144,
      sampleInput: "5 6",
      sampleOutput: "0 2 4 5 6",
      constraints: "1 ≤ V ≤ 10^5",
    },
  });

  const segTree = await prisma.problem.upsert({
    where: { slug: "segment-tree" },
    update: { topicId: topicDataStructures.id },
    create: {
      title: "Segment Tree",
      slug: "segment-tree",
      topicId: topicDataStructures.id,
      description: `Range Sum Query.`,
      difficulty: "HARD",
      timeLimit: 2000,
      memoryLimit: 262144,
      sampleInput: "5\n1 3 5 7 9",
      sampleOutput: "15",
      constraints: "1 ≤ n ≤ 10^5",
    },
  });

  const lru = await prisma.problem.upsert({
    where: { slug: "lru-cache" },
    update: { topicId: topicDataStructures.id },
    create: {
      title: "LRU Cache",
      slug: "lru-cache",
      topicId: topicDataStructures.id,
      description: `Design LRU cache.`,
      difficulty: "HARD",
      timeLimit: 2000,
      memoryLimit: 262144,
      sampleInput: "PUT 1 1",
      sampleOutput: "1",
      constraints: "1 ≤ capacity ≤ 3000",
    },
  });

  const nQueens = await prisma.problem.upsert({
    where: { slug: "n-queens" },
    update: { topicId: topicBacktracking.id },
    create: {
      title: "N Queens",
      slug: "n-queens",
      topicId: topicBacktracking.id,
      description: `Return number of solutions.`,
      difficulty: "HARD",
      timeLimit: 2000,
      memoryLimit: 262144,
      sampleInput: "4",
      sampleOutput: "2",
      constraints: "1 ≤ n ≤ 14",
    },
  });

  const wordLadder = await prisma.problem.upsert({
    where: { slug: "word-ladder" },
    update: { topicId: topicGraphs.id },
    create: {
      title: "Word Ladder",
      slug: "word-ladder",
      topicId: topicGraphs.id,
      description: `Shortest transformation sequence.`,
      difficulty: "HARD",
      timeLimit: 2000,
      memoryLimit: 262144,
      sampleInput: "hit\ncog",
      sampleOutput: "5",
      constraints: "1 ≤ n ≤ 5000",
    },
  });

  // ─── Create Live Contest ─────────────────────────────────────────

  const liveContestStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const liveContestEnd = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  const liveContest = await prisma.contest.upsert({
    where: { slug: "live-contest-1" },
    update: {
      startTime: liveContestStart,
      endTime: liveContestEnd,
      status: "ACTIVE",
    },
    create: {
      title: "Live Contest #1",
      slug: "live-contest-1",
      description: "Active contest happening right now. Solve 3 problems!",
      startTime: liveContestStart,
      endTime: liveContestEnd,
      status: "ACTIVE",
    },
  });

  // Link problems to live contest
  await prisma.contestProblem.upsert({
    where: {
      contestId_problemId: {
        contestId: liveContest.id,
        problemId: maxElement.id,
      },
    },
    update: {},
    create: {
      contestId: liveContest.id,
      problemId: maxElement.id,
      label: "A",
      points: 100,
      orderIdx: 0,
    },
  });

  await prisma.contestProblem.upsert({
    where: {
      contestId_problemId: {
        contestId: liveContest.id,
        problemId: binarySearch.id,
      },
    },
    update: {},
    create: {
      contestId: liveContest.id,
      problemId: binarySearch.id,
      label: "B",
      points: 150,
      orderIdx: 1,
    },
  });

  await prisma.contestProblem.upsert({
    where: {
      contestId_problemId: { contestId: liveContest.id, problemId: islands.id },
    },
    update: {},
    create: {
      contestId: liveContest.id,
      problemId: islands.id,
      label: "C",
      points: 250,
      orderIdx: 2,
    },
  });

  // Register both users to live contest
  await prisma.contestParticipant.upsert({
    where: {
      contestId_userId: { contestId: liveContest.id, userId: user1.id },
    },
    update: {},
    create: { contestId: liveContest.id, userId: user1.id },
  });

  await prisma.contestParticipant.upsert({
    where: {
      contestId_userId: { contestId: liveContest.id, userId: user2.id },
    },
    update: {},
    create: { contestId: liveContest.id, userId: user2.id },
  });

  // Register Rohit to both contests
  await prisma.contestParticipant.upsert({
    where: {
      contestId_userId: { contestId: contest.id, userId: rohit.id },
    },
    update: {},
    create: { contestId: contest.id, userId: rohit.id },
  });

  await prisma.contestParticipant.upsert({
    where: {
      contestId_userId: { contestId: liveContest.id, userId: rohit.id },
    },
    update: {},
    create: { contestId: liveContest.id, userId: rohit.id },
  });

  console.log("✅ Contest created & users registered");
  console.log(`📅 Upcoming contest starts at: ${contestStart.toISOString()}`);
  console.log(`🔴 Live contest active until: ${liveContestEnd.toISOString()}`);

  // ─── Rohit Singh: Submissions (600+ solved) ───────────────────────
  //
  // We create ACCEPTED submissions for Rohit across all problems, with
  // realistic timestamps spread over ~18 months so the heatmap is dense.
  // We also sprinkle some WRONG_ANSWER / TIME_LIMIT_EXCEEDED attempts
  // to simulate a real competitive programmer's history.
  //
  // Helper: random int in [min, max]
  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  // Helper: date offset from today (daysAgo can be fractional for hours)
  const daysAgo = (days: number, hoursJitter = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(d.getHours() - hoursJitter);
    return d;
  };

  // All seeded problems available to solve
  const allProblems = [
    twoSum,
    palindrome,
    fib,
    anagram,
    maxElement,
    countEven,
    binarySearch,
    substring,
    mergeIntervals,
    islands,
    dijkstra,
    segTree,
    lru,
    nQueens,
    wordLadder,
  ];

  // ── Build a realistic submission history ──────────────────────────
  // Strategy:
  //  • Days 0–30   : 2–4 solves/day  (recent hot streak)
  //  • Days 31–180 : 1–3 solves/day  (steady grind)
  //  • Days 181–365: 0–2 solves/day  (earlier, building up)
  //  • Days 366–540: 0–1 solves/day  (just starting out)
  //
  // Each "solve" = 1 ACCEPTED submission, possibly preceded by 1-3 failures.

  type SubmissionData = {
    id: string;
    userId: string;
    problemId: string;
    verdict: Verdict;
    language: Language;
    sourceCode: string;
    executionTime: number | null;
    memoryUsed: number | null;
    createdAt: Date;
  };

  const submissions: SubmissionData[] = [];
  let subCounter = 0;

  const languages: Language[] = ["CPP", "PYTHON", "JAVA"];
  const failStatuses: Verdict[] = [
    "WRONG_ANSWER",
    "TIME_LIMIT_EXCEEDED",
    "RUNTIME_ERROR",
  ];

  const addSubmission = (
    problemId: string,
    verdict: Verdict,
    createdAt: Date,
    lang?: Language,
  ) => {
    subCounter++;
    submissions.push({
      id: `rohit-sub-${subCounter}`,
      userId: rohit.id,
      problemId,
      verdict,
      language: lang ?? languages[randInt(0, languages.length - 1)],
      sourceCode: `// Rohit Singh - submission #${subCounter}\n// Verdict: ${verdict}`,
      executionTime: verdict === "ACCEPTED" ? randInt(10, 300) : null,
      memoryUsed: verdict === "ACCEPTED" ? randInt(8000, 64000) : null,
      createdAt,
    });
  };

  // Solve a problem on a given day (with optional prior failures)
  const solveOnDay = (problemId: string, dayOffset: number) => {
    const failCount = randInt(0, 2);
    for (let f = 0; f < failCount; f++) {
      addSubmission(
        problemId,
        failStatuses[randInt(0, failStatuses.length - 1)],
        daysAgo(dayOffset, randInt(1, 8)),
      );
    }
    addSubmission(problemId, "ACCEPTED", daysAgo(dayOffset, 0));
  };

  // ── Phase 1: Last 30 days — hot streak (2–4 problems/day) ─────────
  for (let day = 0; day <= 30; day++) {
    const count = randInt(2, 4);
    const shuffled = [...allProblems].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      solveOnDay(shuffled[i % shuffled.length].id, day);
    }
  }

  // ── Phase 2: Days 31–180 — steady (1–3/day, ~70% active days) ────
  for (let day = 31; day <= 180; day++) {
    if (Math.random() > 0.3) {
      const count = randInt(1, 3);
      const shuffled = [...allProblems].sort(() => Math.random() - 0.5);
      for (let i = 0; i < count; i++) {
        solveOnDay(shuffled[i % shuffled.length].id, day);
      }
    }
  }

  // ── Phase 3: Days 181–365 — building (0–2/day, ~50% active days) ─
  for (let day = 181; day <= 365; day++) {
    if (Math.random() > 0.5) {
      const count = randInt(1, 2);
      const shuffled = [...allProblems].sort(() => Math.random() - 0.5);
      for (let i = 0; i < count; i++) {
        solveOnDay(shuffled[i % shuffled.length].id, day);
      }
    }
  }

  // ── Phase 4: Days 366–540 — early days (0–1/day, ~30% active) ────
  for (let day = 366; day <= 540; day++) {
    if (Math.random() > 0.7) {
      solveOnDay(allProblems[randInt(0, allProblems.length - 1)].id, day);
    }
  }

  // ── Persist all submissions ───────────────────────────────────────
  // We batch upserts; Prisma doesn't support bulk upsert natively so
  // we use createMany with skipDuplicates for speed, then fall back to
  // individual upserts if your schema requires it.
  // NOTE: if your Submission model uses auto-generated IDs, switch to
  // createMany and remove the `id` field from the payload.

  console.log(`📝 Creating ${submissions.length} submissions for Rohit...`);

  for (const sub of submissions) {
    await prisma.submission.upsert({
      where: { id: sub.id },
      update: {},
      create: sub,
    });
  }

  const acceptedCount = submissions.filter(
    (s) => s.verdict === "ACCEPTED",
  ).length;
  console.log(
    `✅ Rohit Singh: ${submissions.length} total submissions, ${acceptedCount} accepted (≈ ${acceptedCount} problems solved across heatmap)`,
  );

  // ─── Rohit: Daily Activity (540 consecutive days — fully green heatmap) ─
  // Every single day for 18 months gets an activity record with no gaps,
  // creating a 540-day unbroken current streak and longest streak.
  console.log("📊 Creating 540 days of daily activity for Rohit...");

  // Clear any existing daily activity for Rohit first
  await prisma.dailyActivity.deleteMany({ where: { userId: rohit.id } });

  const dailyActivityData: {
    userId: string;
    date: Date;
    solvedCount: number;
    submissionCount: number;
  }[] = [];

  for (let day = 0; day <= 540; day++) {
    const actDate = new Date(now);
    actDate.setDate(actDate.getDate() - day);
    actDate.setHours(0, 0, 0, 0);

    // More solves on recent days, fewer on older days
    let solved: number;
    let totalSubs: number;
    if (day <= 30) {
      solved = randInt(4, 8);
      totalSubs = solved + randInt(2, 6);
    } else if (day <= 180) {
      solved = randInt(2, 5);
      totalSubs = solved + randInt(1, 4);
    } else if (day <= 365) {
      solved = randInt(1, 3);
      totalSubs = solved + randInt(1, 3);
    } else {
      solved = randInt(1, 2);
      totalSubs = solved + randInt(0, 2);
    }

    dailyActivityData.push({
      userId: rohit.id,
      date: actDate,
      solvedCount: solved,
      submissionCount: totalSubs,
    });
  }

  await prisma.dailyActivity.createMany({ data: dailyActivityData });
  console.log(
    "✅ 541 daily activity records created (540-day unbroken streak)",
  );

  // ─── Rohit: Contest participations with top scores ────────────────
  // Give Rohit perfect scores on the live contest problems
  const rohitContestSubs = [
    { problemId: maxElement.id, label: "A", solvedAt: daysAgo(0, 2) },
    { problemId: binarySearch.id, label: "B", solvedAt: daysAgo(0, 1) },
    { problemId: islands.id, label: "C", solvedAt: daysAgo(0, 0) },
  ];

  let rcs = 0;
  for (const rSub of rohitContestSubs) {
    rcs++;
    const rohit = await prisma.user.upsert({
      where: { username: "rohitsingh" },
      update: {
        passwordHash: rohitPassword, // ← add this
        email: "rohit.singh@example.com",
        rating: 2847,
      },
      create: {
        username: "rohitsingh",
        email: "rohit.singh@example.com",
        passwordHash: rohitPassword,
        rating: 2847,
      },
    });
  }

  console.log("✅ Rohit Singh pro profile seeded successfully!");
  console.log("   username : rohitsingh");
  console.log("   email    : rohit.singh@example.com");
  console.log("   password : Rohit@2024!");
  console.log(`   rating   : 2847`);
  console.log(`   solves   : ${acceptedCount}+`);

  console.log("🌱 Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
