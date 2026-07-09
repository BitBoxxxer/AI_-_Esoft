import { prisma } from "../config/prisma";
import { fetchContributions } from "../utils/github";
import { withRetry } from "../utils/prismaRetry";
import authService from "./auth.service";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Разбивает массив на чанки заданного размера
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

class StatsService {
  async getStats(userId: string, days: number) {
    return withRetry(() =>
      prisma.dailyStats.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: days,
      })
    );
  }

  async refreshStats(userId: string) {
    const account = await authService.getGithubAccount(userId);
    if (!account) {
      throw new HttpError(401, "GitHub аккаунт не подключен или токен устарел — войдите снова");
    }

    const days = await fetchContributions(account.login, account.accessToken);
    if (days.length === 0) return 0;

    // Батчами по 50 записей — большие createMany (300+ строк) через
    // Supabase pooler иногда рвут соединение (ConnectionReset).
    // Чанки меньше = запросы быстрее = меньше шанс попасть под обрыв.
    const CHUNK_SIZE = 50;
    const dayChunks = chunk(days, CHUNK_SIZE);

    for (const dayChunk of dayChunks) {
      await withRetry(() =>
        prisma.dailyStats.createMany({
          data: dayChunk.map((day) => ({
            userId,
            date: new Date(day.date + "T00:00:00Z"),
            contributions: day.contributionCount,
            commits: 0,
            prs: 0,
            issues: 0,
          })),
          skipDuplicates: true,
        })
      );
    }

    // Обновляем существующие записи, тоже чанками группируя по значению
    const grouped = new Map<number, Date[]>();
    for (const day of days) {
      const date = new Date(day.date + "T00:00:00Z");
      const cnt = day.contributionCount;
      if (!grouped.has(cnt)) grouped.set(cnt, []);
      grouped.get(cnt)!.push(date);
    }

    for (const [contributions, dates] of grouped) {
      // На случай если для одного contributions накопилось много дат —
      // тоже режем чанками
      for (const dateChunk of chunk(dates, CHUNK_SIZE)) {
        await withRetry(() =>
          prisma.dailyStats.updateMany({
            where: {
              userId,
              date: { in: dateChunk },
            },
            data: { contributions },
          })
        );
      }
    }

    return days.length;
  }

  async getDashboard(userId: string) {
    const [user, stats] = await Promise.all([
      withRetry(() =>
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            image: true,
            githubLogin: true,
            dailyGoal: true,
            notifyAboutGoal: true,
          },
        })
      ),
      withRetry(() =>
        prisma.dailyStats.findMany({
          where: { userId },
          orderBy: { date: "desc" },
          take: 365,
        })
      ),
    ]);

    const dailyGoal = user?.dailyGoal ?? 0;
    const notifyAboutGoal = user?.notifyAboutGoal ?? true;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayStats = stats.find(
      (s) => s.date.toISOString().slice(0, 10) === todayStr
    );
    const todayContributions = todayStats?.contributions ?? 0;

    if (notifyAboutGoal && dailyGoal > 0 && todayContributions < dailyGoal) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const existing = await withRetry(() =>
        prisma.notification.findFirst({
          where: {
            userId,
            type: "goal_not_met",
            createdAt: { gte: startOfDay },
          },
        })
      );
      if (!existing) {
        await withRetry(() =>
          prisma.notification.create({
            data: {
              userId,
              type: "goal_not_met",
              message: `Ты ещё не выполнил дневную норму (${todayContributions}/${dailyGoal}). Есть время до конца дня!`,
            },
          })
        );
      }
    }

    return { user, stats, todayContributions };
  }
}

export default new StatsService();