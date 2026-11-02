import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 needs a driver adapter; the connection string comes from
 * `DATABASE_URL`, which Next loads from `.env` for the server runtime.
 *
 * The client is cached on `globalThis` so development hot reloads reuse one
 * connection pool instead of opening a new one per edit.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  __mimoriPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.__mimoriPrisma) {
    return globalForPrisma.__mimoriPrisma;
  }

  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set, so the widget store is unreachable.");
  }

  const client = new PrismaClient({ adapter: new PrismaPg(url) });
  globalForPrisma.__mimoriPrisma = client;

  return client;
}
