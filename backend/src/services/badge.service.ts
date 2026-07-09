import { prisma } from "../config/prisma";
import { withRetry } from "../utils/prismaRetry";
import { fetchContributions, calculateStreakFromDays } from "../utils/github";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час — бейдж в чужом README не должен дёргать GitHub часто
const cache = new Map<string, { svg: string; expiresAt: number }>();

const COLORS = {
  bg: "#0d1117",
  border: "#30363d",
  text: "#c9d1d9",
  subtext: "#8b949e",
  fire: "#f78166",
  cellEmpty: "#161b22",
  cellLevels: ["#0e4429", "#006d32", "#26a641", "#39d353"], // github-style green scale
};

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

function cellColor(count: number): string {
  if (count <= 0) return COLORS.cellEmpty;
  if (count < 3) return COLORS.cellLevels[0];
  if (count < 6) return COLORS.cellLevels[1];
  if (count < 10) return COLORS.cellLevels[2];
  return COLORS.cellLevels[3];
}

// Бейдж "не зарегистрирован" — мягкий призыв попробовать приложение
function buildNotRegisteredSvg(login: string): string {
  const width = 380;
  const height = 90;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="10" fill="${COLORS.bg}" stroke="${COLORS.border}"/>
  <text x="16" y="34" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14" fill="${COLORS.text}">
    @${escapeXml(login)} ещё не в Habit Grabbit
  </text>
  <text x="16" y="58" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="12" fill="${COLORS.subtext}">
    Отслеживай свой GitHub-стрик — habit-grabbit.vercel.app
  </text>
</svg>`;
}

function buildStreakSvg(login: string, streak: number, last14: number[]): string {
  const width = 380;
  const height = 90;
  const cellSize = 14;
  const cellGap = 4;
  const gridStartX = 16;
  const gridStartY = 58;

  const cells = last14
    .map((count, i) => {
      const x = gridStartX + i * (cellSize + cellGap);
      return `<rect x="${x}" y="${gridStartY}" width="${cellSize}" height="${cellSize}" rx="3" fill="${cellColor(count)}"/>`;
    })
    .join("\n    ");

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="10" fill="${COLORS.bg}" stroke="${COLORS.border}"/>
  <text x="16" y="26" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="13" fill="${COLORS.subtext}">
    @${escapeXml(login)} · Habit Grabbit
  </text>
  <text x="16" y="46" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="16" font-weight="bold" fill="${COLORS.fire}">
    🔥 ${streak} ${streak === 1 ? "день" : "дней"} подряд
  </text>
  ${cells}
</svg>`;
}

class BadgeService {
  async getSvg(login: string): Promise<string> {
    const cached = cache.get(login);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.svg;
    }

    const svg = await this.generate(login);
    cache.set(login, { svg, expiresAt: Date.now() + CACHE_TTL_MS });
    return svg;
  }

  private async generate(login: string): Promise<string> {
    const user = await withRetry(() =>
      prisma.user.findFirst({ where: { githubLogin: login } })
    );

    if (!user) {
      return buildNotRegisteredSvg(login);
    }

    const account = await withRetry(() =>
      prisma.account.findFirst({ where: { userId: user.id, provider: "github" } })
    );

    if (!account?.access_token) {
      return buildNotRegisteredSvg(login);
    }

    const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();

    const days = await fetchContributions(login, account.access_token, from, to);
    const streak = calculateStreakFromDays(days);
    const last14 = days.slice(-14).map((d) => d.contributionCount);

    return buildStreakSvg(login, streak, last14);
  }
}

export default new BadgeService();
