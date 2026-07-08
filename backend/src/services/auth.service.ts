import { prisma } from "../config/prisma";
import {
  exchangeCodeForToken,
  fetchGithubProfile,
  GithubProfile,
} from "../utils/github";
import { signJwt } from "../utils/jwt";

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

    // Ищем существующую привязку GitHub-аккаунта
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "github",
          providerAccountId,
        },
      },
    });

    let userId: string;

    if (existingAccount) {
      userId = existingAccount.userId;

      await prisma.user.update({
        where: { id: userId },
        data: {
          name: profile.name ?? undefined,
          email: profile.email ?? undefined,
          image: profile.avatar_url,
        },
      });

      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { access_token: accessToken },
      });
    } else {
      // Пытаемся связать по email, если аккаунт уже существовал по другой причине
      const user = await prisma.user.upsert({
        where: { email: profile.email ?? `github-${providerAccountId}@no-email.local` },
        update: {
          name: profile.name ?? undefined,
          image: profile.avatar_url,
        },
        create: {
          email: profile.email ?? `github-${providerAccountId}@no-email.local`,
          name: profile.name,
          image: profile.avatar_url,
        },
      });

      userId = user.id;

      await prisma.account.create({
        data: {
          userId,
          type: "oauth",
          provider: "github",
          providerAccountId,
          access_token: accessToken,
        },
      });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const token = signJwt({ id: user.id, email: user.email, name: user.name });

    return { token, user, login: profile.login };
  }

  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        dailyGoal: true,
        notifyAboutGoal: true,
      },
    });
  }

  // Достаём login и access_token GitHub-аккаунта пользователя (нужно для /stats/refresh)
  async getGithubAccount(userId: string) {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "github" },
    });
    if (!account || !account.access_token) return null;

    // login мы не храним отдельно в БД, поэтому забираем его свежим из GitHub API
    const profile = await fetchGithubProfile(account.access_token);
    return { login: profile.login, accessToken: account.access_token };
  }
}

export default new AuthService();
