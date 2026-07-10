import { prisma } from "../config/prisma";
import {
  exchangeCodeForToken,
  fetchGithubProfile,
  GithubProfile,
} from "../utils/github";
import { signJwt } from "../utils/jwt";
import { withRetry } from "../utils/prismaRetry";
import { invalidateStatsCache } from "./stats.service";
import { invalidateGraph3dCache } from "./graph3d.service";
import { invalidateWatchedActivityCache } from "./watched.service";

class AuthService {
  getGithubAuthorizeUrl(state: string) {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_ID as string,
      redirect_uri: process.env.GITHUB_CALLBACK_URL as string,
      scope: "read:user user:email public_repo",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async handleGithubCallback(code: string) {
    const { access_token: accessToken } = await exchangeCodeForToken(code);
    const profile: GithubProfile = await fetchGithubProfile(accessToken);

    const providerAccountId = String(profile.id);
    const emailFallback = `github-${providerAccountId}@no-email.local`;

    const existingAccount = await withRetry(() =>
      prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "github",
            providerAccountId,
          },
        },
      })
    );

    let user: { id: string; email: string | null; name: string | null };

    if (existingAccount) {
      user = await withRetry(() =>
        prisma.user.update({
          where: { id: existingAccount.userId },
          data: {
            name: profile.name ?? undefined,
            email: profile.email ?? undefined,
            image: profile.avatar_url,
            githubLogin: profile.login,
          },
          select: { id: true, email: true, name: true },
        })
      );

      // Обновляем токен - нужен для GitHub GraphQL API (/stats/refresh)
      // Запускаем fire-and-forget: если PgBouncer сбросит соединение - не роняем весь callback
      withRetry(() =>
        prisma.account.update({
          where: { id: existingAccount.id },
          data: { access_token: accessToken },
        })
      ).catch((e) => console.warn("[auth] access_token update failed (non-critical):", e.message));
    } else {
      const upserted = await withRetry(() =>
        prisma.user.upsert({
          where: { email: profile.email ?? emailFallback },
          update: {
            name: profile.name ?? undefined,
            image: profile.avatar_url,
            githubLogin: profile.login,
          },
          create: {
            email: profile.email ?? emailFallback,
            name: profile.name,
            image: profile.avatar_url,
            githubLogin: profile.login,
          },
          select: { id: true, email: true, name: true },
        })
      );

      await withRetry(() =>
        prisma.account.create({
          data: {
            userId: upserted.id,
            type: "oauth",
            provider: "github",
            providerAccountId,
            access_token: accessToken,
          },
        })
      );

      user = upserted;
    }

    const token = signJwt({ id: user.id, email: user.email, name: user.name });

    // Пользователь мог переподключить другой GitHub-аккаунт (другой login,
    // другой access_token) - старые закэшированные статы/3D-график/активность
    // друзей по этому userId больше не актуальны, сбрасываем их.
    invalidateStatsCache(user.id);
    invalidateGraph3dCache(user.id);
    invalidateWatchedActivityCache(user.id);

    return { token, user, login: profile.login };
  }

  async getMe(userId: string) {
    return withRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          githubLogin: true,
          dailyGoal: true,
          notifyAboutGoal: true,
        },
      })
    );
  }

  async getGithubAccount(userId: string) {
    const [user, account] = await Promise.all([
      withRetry(() => prisma.user.findUnique({ where: { id: userId } })),
      withRetry(() =>
        prisma.account.findFirst({ where: { userId, provider: "github" } })
      ),
    ]);
    if (!account || !account.access_token) return null;

    const login =
      user?.githubLogin ||
      (await fetchGithubProfile(account.access_token)).login;
    return { login, accessToken: account.access_token };
  }
}

export default new AuthService();