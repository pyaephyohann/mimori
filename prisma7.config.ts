// Prisma 7 configuration. This version reads the connection URL from here,
// not from the datasource block in prisma/schema.prisma.
//
// Node loads .env natively, so no dotenv dependency is needed. DATABASE_URL
// must point at a PostgreSQL database; no real .env is committed.
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
