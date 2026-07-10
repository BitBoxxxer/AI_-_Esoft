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

// "Прогрев" соединения: Supabase (free tier) может тихо закрывать. Он живет 10-15 минут
const HEARTBEAT_INTERVAL_MS = 20_000;

setInterval(() => {
  prisma.$queryRaw`SELECT 1`.catch(() => {
  });
}, HEARTBEAT_INTERVAL_MS);

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});