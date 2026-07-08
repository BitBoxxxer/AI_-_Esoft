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
}

export default new StatsService();
