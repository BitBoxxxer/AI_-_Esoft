import { prisma } from "../config/prisma";
import { withRetry } from "../utils/prismaRetry";
import authService from "./auth.service";
import { HttpError } from "./stats.service";
import {
  fetchContributions,
  fetchFollowers,
  fetchFollowing,
  fetchPublicProfile,
  calculateStreakFromDays,
  ContributionDay,
} from "../utils/github";

// Кэш активности отслеживаемых пользователей
const activityCache = new Map<
  string,
  { data: WatchedActivity[]; expiresAt: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

export interface WatchedActivity {
  id: string;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
  streak: number;
  last30Days: ContributionDay[];
}

class WatchedService {
  async list(userId: string) {
    return withRetry(() =>
      prisma.watchedUser.findMany({
        where: { watcherId: userId },
        orderBy: { createdAt: "asc" },
      })
    );
  }

  async add(userId: string, githubLogin: string) {
    const login = githubLogin.trim().replace(/^@/, "");
    if (!login) {
      throw new HttpError(400, "Укажи GitHub-логин");
    }

    const account = await authService.getGithubAccount(userId);
    if (!account) {
      throw new HttpError(401, "GitHub аккаунт не подключен");
    }

    const profile = await fetchPublicProfile(login, account.accessToken);
    if (!profile) {
      throw new HttpError(404, `Пользователь "${login}" не найден на GitHub`);
    }

    try {
      const created = await withRetry(() =>
        prisma.watchedUser.create({
          data: { watcherId: userId, githubLogin: profile.login },
        })
      );
      invalidateCache(userId);
      return created;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        throw new HttpError(409, "Этот пользователь уже отслеживается");
      }
      throw err;
    }
  }

  async remove(userId: string, id: string) {
    const watched = await withRetry(() =>
      prisma.watchedUser.findUnique({ where: { id } })
    );
    if (!watched || watched.watcherId !== userId) {
      throw new HttpError(404, "Не найдено");
    }
    await withRetry(() => prisma.watchedUser.delete({ where: { id } }));
    invalidateCache(userId);
  }

  // Предлагает добавить из подписанных на юзера или на кого сам чел подписан
  async suggestions(userId: string) {
    const account = await authService.getGithubAccount(userId);
    if (!account) {
      throw new HttpError(401, "GitHub аккаунт не подключен");
    }

    const [followers, following, alreadyWatched] = await Promise.all([
      fetchFollowers(account.accessToken),
      fetchFollowing(account.accessToken),
      this.list(userId),
    ]);

    const watchedLogins = new Set(alreadyWatched.map((w) => w.githubLogin));
    const seen = new Set<string>();
    const suggestions: { login: string; name: string | null; avatarUrl: string }[] = [];

    for (const person of [...followers, ...following]) {
      if (watchedLogins.has(person.login) || seen.has(person.login)) continue;
      // Не предлагает добавить самого себя (какой дурак это будет делать huh ?)
      if (person.login === account.login) continue;
      seen.add(person.login);
      suggestions.push({
        login: person.login,
        name: person.name ?? null,
        avatarUrl: person.avatar_url,
      });
    }

    return suggestions;
  }

  // Активность (стрик + последние 30 дней) по всем отслеживаемым
  async getActivity(userId: string): Promise<WatchedActivity[]> {
    const cached = activityCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const account = await authService.getGithubAccount(userId);
    if (!account) {
      throw new HttpError(401, "GitHub аккаунт не подключен");
    }

    const watched = await this.list(userId);
    if (watched.length === 0) return [];

    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();

    // Тянет последовательно, чтобы не улететь по rate-limit GitHub
    const results: WatchedActivity[] = [];
    for (const w of watched) {
      try {
        const [days, profile] = await Promise.all([
          fetchContributions(w.githubLogin, account.accessToken, from, to),
          fetchPublicProfile(w.githubLogin, account.accessToken),
        ]);

        results.push({
          id: w.id,
          githubLogin: w.githubLogin,
          name: profile?.name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          streak: calculateStreakFromDays(days),
          last30Days: days,
        });
      } catch (err) {
        console.error(`[watched] Не удалось получить активность ${w.githubLogin}:`, err);
      }
    }

    activityCache.set(userId, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
    return results;
  }
}

function invalidateCache(userId: string) {
  activityCache.delete(userId);
}

export function invalidateWatchedActivityCache(userId: string) {
  invalidateCache(userId);
}

export default new WatchedService();
