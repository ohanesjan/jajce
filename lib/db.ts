import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before creating PrismaClient.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export function getDb(): PrismaClient {
  if (!globalThis.__prisma__) {
    globalThis.__prisma__ = createPrismaClient();
  }

  return globalThis.__prisma__;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getDb();
    const value = Reflect.get(client as object, property, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
