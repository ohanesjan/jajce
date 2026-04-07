import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prefer a direct connection for Prisma CLI workflows such as migrations,
    // while preserving the existing local DATABASE_URL fallback for development.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
