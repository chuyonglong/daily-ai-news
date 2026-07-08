import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "@/lib/runtime-paths";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

process.env.DATABASE_URL = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
