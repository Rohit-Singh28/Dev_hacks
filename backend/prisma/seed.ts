import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  console.log("✅ Users created");

  // ─── Create Problems ─────────────────────────────────────────────

  const twoSum = await prisma.problem.upsert({
    where: { slug: "two-sum" },
    update: {},
    create: {
      title: "Two Sum",
      slug: "two-sum",
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
    update: {},
    create: {
      title: "Palindrome Check",
      slug: "palindrome-check",
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
    update: {},
    create: {
      title: "Fibonacci Number",
      slug: "fibonacci-number",
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

  console.log("✅ Contest created & users registered");
  console.log(`📅 Contest starts at: ${contestStart.toISOString()}`);
  console.log("🌱 Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
