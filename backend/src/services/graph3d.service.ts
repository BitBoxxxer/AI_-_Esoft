import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import authService from "./auth.service";
import { HttpError } from "./stats.service";

const execFileAsync = promisify(execFile);

// Путь до собранного CLI пакета yoshi389111/github-profile-3d-contrib.
// Устанавливается командой:
//   npm install github:yoshi389111/github-profile-3d-contrib
// Пакет уже содержит собранный dist/index.js (это обязательное требование
// для GitHub Actions на JS - билд-шаг не нужен).
const CLI_PATH = path.join(
  __dirname,
  "..",
  "..",
  "node_modules",
  "github-profile-3d-contrib",
  "dist",
  "index.js"
);

// По умолчанию тулза генерирует несколько вариантов SVG в папку
// <cwd>/profile-3d-contrib/*.svg. Берём "ночной радужный" - он больше всего
// похож на то, что было в твоём README.
const OUTPUT_FILENAME = "profile-night-rainbow.svg";

// Кэш готовых SVG на пользователя, чтобы не гонять генерацию (которая сама
// делает несколько запросов к GitHub GraphQL/REST) на каждый чих
const cache = new Map<string, { svg: string; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут - эта картинка и так меняется медленно

export function invalidateGraph3dCache(userId: string) {
  cache.delete(userId);
}

class Graph3DService {
  async getSvg(userId: string, forceRefresh = false): Promise<string> {
    const account = await authService.getGithubAccount(userId);
    if (!account) {
      throw new HttpError(
        401,
        "GitHub аккаунт не подключен или токен устарел - войдите снова"
      );
    }

    const cached = cache.get(userId);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.svg;
    }

    const svg = await this.generate(account.login, account.accessToken);
    cache.set(userId, { svg, expiresAt: Date.now() + CACHE_TTL_MS });
    return svg;
  }

  private async generate(login: string, accessToken: string): Promise<string> {
    // Отдельная временная папка на каждый вызов - чтобы параллельные
    // генерации для разных пользователей не затирали файлы друг друга
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "3d-contrib-"));

    try {
      await execFileAsync("node", [CLI_PATH, login], {
        cwd: workDir,
        env: {
          ...process.env,
          GITHUB_TOKEN: accessToken,
        },
        timeout: 30_000, // генерация делает несколько запросов к GitHub, даём 30 сек
      });

      const svgPath = path.join(workDir, "profile-3d-contrib", OUTPUT_FILENAME);
      const svg = await fs.readFile(svgPath, "utf-8");
      return svg;
    } catch (err) {
      console.error("[graph3d] Ошибка генерации SVG:", err);
      throw new HttpError(500, "Не удалось сгенерировать 3D-график активности");
    } finally {
      // Подчищаем за собой - эти временные SVG-файлы больше не нужны,
      // мы их уже прочитали и закэшировали в памяти
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export default new Graph3DService();