import { prisma } from "../config/prisma";
import { fetchContributions } from "../utils/github";
import authService from "./auth.service";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

class StatsService {
  async getStats(userId: string, days: number) {
    return prisma.dailyStats.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: days,
    });
  }

  async refreshStats(userId: string) {
    const account = await authService.getGithubAccount(userId);
    if (!account) {
      throw new HttpError(401, "GitHub аккаунт не подключен");
    }

    const days = await fetchContributions(account.login, account.accessToken);

    for (const day of days) {
      await prisma.dailyStats.upsert({
        where: {
          userId_date: {
            userId,
            date: new Date(day.date + "T00:00:00Z"),
          },
        },
        update: {
          contributions: day.contributionCount,
        },
        create: {
          userId,
          date: new Date(day.date + "T00:00:00Z"),
          contributions: day.contributionCount,
          commits: 0,
          prs: 0,
          issues: 0,
        },
      });
    }

    return days.length;
  }

  // Данные для главной страницы: профиль + статистика за 365 дней +
  // (при необходимости) создание уведомления "норма не выполнена"
  async getDashboard(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        githubLogin: true,
        dailyGoal: true,
        notifyAboutGoal: true,
      },
    });

    const stats = await prisma.dailyStats.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 365,
    });

    const dailyGoal = user?.dailyGoal ?? 0;
    const notifyAboutGoal = user?.notifyAboutGoal ?? true;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayStats = stats.find(
      (s) => s.date.toISOString().slice(0, 10) === todayStr
    );
    const todayContributions = todayStats?.contributions ?? 0;

    if (notifyAboutGoal && dailyGoal > 0 && todayContributions < dailyGoal) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: "goal_not_met",
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            type: "goal_not_met",
            message: `Ты ещё не выполнил дневную норму (${todayContributions}/${dailyGoal}). Есть время до конца дня!`,
          },
        });
      }
    }

    return { user, stats, todayContributions };
  }
}

export default new StatsService();
