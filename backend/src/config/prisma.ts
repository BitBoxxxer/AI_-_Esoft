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

// "Прогрев" соединения: Supabase (free tier) может тихо закрывать
// соединение, если оно простаивало какое-то время. Обычный пользовательский
// трафик идёт неравномерно (то густо, то пусто), и в момент "пусто"
// соединение из пула Prisma успевает "протухнуть". Лёгкий пинг раз в 20 сек
// не даёт этому случиться - соединение почти всегда свежее к моменту
// реального запроса.
const HEARTBEAT_INTERVAL_MS = 20_000;

setInterval(() => {
  prisma.$queryRaw`SELECT 1`.catch(() => {
    // Игнорируем - если не получилось, следующий реальный запрос
    // всё равно обработает withRetry
  });
}, HEARTBEAT_INTERVAL_MS);

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});