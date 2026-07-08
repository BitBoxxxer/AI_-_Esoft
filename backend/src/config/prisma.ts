import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL не задан в .env");
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: { db: { url } },
  });
}

export const prisma = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

// При старте сразу устанавливаем соединение чтобы не было холодного старта
prisma.$connect().catch((e) => {
  console.error("[prisma] initial connect failed:", e.message);
});

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});