import { prisma } from "../config/prisma";
import { fetchContributions, ContributionDay, latestDateStr } from "../utils/github";
import { withRetry } from "../utils/prismaRetry";
import authService from "./auth.service";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Форма данных, которую ждёт фронт (Heatmap.tsx читает поле contributions)
interface FrontendDailyStat {
  date: string;
  contributions: number;
  commits: number;
  prs: number;
  issues: number;
}

function toFrontendShape(days: ContributionDay[]): FrontendDailyStat[] {
  return days.map((d) => ({
    date: d.date,
    contributions: d.contributionCount,
    commits: 0,
    prs: 0,
    issues: 0,
  }));
}

// Простой in-memory кэш, чтобы не долбить GitHub GraphQL на каждый чих
// (дашборд + уведомления могут запрашиваться почти одновременно).
// Живёт только пока жив процесс — это ок, это не источник правды, а просто TTL-кэш.
const cache = new Map<string, { data: ContributionDay[]; expiresAt: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 минуты

async function getCachedContributions(
  userId: string,
  login: string,
  accessToken: string,
  from?: string,
  to?: string
): Promise<ContributionDay[]> {
  const cacheKey = `${userId}:${from ?? "default"}:${to ?? "default"}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const days = await fetchContributions(login, accessToken, from, to);
  cache.set(cacheKey, { data: days, expiresAt: Date.now() + CACHE_TTL_MS });
  return days;
}

function invalidateCache(userId: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) cache.delete(key);
  }
}

export function invalidateStatsCache(userId: string) {
  invalidateCache(userId);
}

class StatsService {
  // Больше не читаем из БД — берём напрямую из GitHub (с кэшем на 2 минуты)
  async getStats(userId: string, days: number) {
    const account = await authService.getGithubAccount(userId);
    if (!account) {
      throw new HttpError(401, "GitHub аккаунт не подключен или токен устарел — войдите снова");
    }

    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();

    const contributionDays = await getCachedContributions(
      userId,
      account.login,
      account.accessToken,
      from,
      to
    );

    return toFrontendShape(contributionDays);
  }

  // Раньше тут был цикл createMany/updateMany на ~365 записей — именно он
  // постоянно ловил обрывы соединения с Supabase. Теперь просто сбрасываем
  // кэш и говорим фронту "сходи забери свежие данные из GitHub".
  async refreshStats(userId: string) {
    const account = await authService.getGithubAccount(userId);
    if (!account) {
      throw new HttpError(401, "GitHub аккаунт не подключен или токен устарел — войдите снова");
    }

    invalidateCache(userId);

    // Один живой запрос к GitHub — без единой записи в Postgres
    const days = await fetchContributions(account.login, account.accessToken);

    // Проверка дневной цели теперь тоже считается по live-данным,
    // а не по значению, которое раньше лежало в dailyStats
    await this.checkDailyGoal(userId, days);

    return days.length;
  }

  async getDashboard(userId: string) {
    const account = await authService.getGithubAccount(userId);

    const [user, contributionDays] = await Promise.all([
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
      account
        ? getCachedContributions(userId, account.login, account.accessToken)
        : Promise.resolve([] as ContributionDay[]),
    ]);

    const stats = toFrontendShape(contributionDays);

    const todayStr = latestDateStr(contributionDays);
    const todayStats = contributionDays.find((d) => d.date === todayStr);
    const todayContributions = todayStats?.contributionCount ?? 0;

    return { user, stats, todayContributions };
  }

  private async checkDailyGoal(userId: string, days: ContributionDay[]) {
    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { dailyGoal: true, notifyAboutGoal: true },
      })
    );

    const dailyGoal = user?.dailyGoal ?? 0;
    const notifyAboutGoal = user?.notifyAboutGoal ?? true;
    if (!notifyAboutGoal || dailyGoal <= 0) return;

    const todayStr = latestDateStr(days);
    const todayContributions =
      days.find((d) => d.date === todayStr)?.contributionCount ?? 0;

    if (todayContributions >= dailyGoal) return;

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
    if (existing) return;

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

export default new StatsService();