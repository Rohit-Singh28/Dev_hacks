import dotenv from "dotenv";
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL!,
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  judge0: {
    apiUrl: process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com",
    apiKey: process.env.JUDGE0_API_KEY || "",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  // Language ID mapping for Judge0 CE
  languageMap: {
    CPP: 54,
    PYTHON: 71,
    JAVA: 62,
  } as const,
};
