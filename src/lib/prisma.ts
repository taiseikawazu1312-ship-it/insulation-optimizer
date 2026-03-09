import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

let prismaInstance: PrismaClient | null = null;

export async function getPrisma(): Promise<PrismaClient> {
  if (prismaInstance) return prismaInstance;

  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    prismaInstance = new PrismaClient({ adapter });
  } else {
    const adapter = new PrismaLibSql({
      url: process.env.DATABASE_URL || "file:prisma/dev.db",
    });
    prismaInstance = new PrismaClient({ adapter });
  }

  return prismaInstance;
}
