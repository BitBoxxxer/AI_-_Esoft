import crypto from "crypto";
import { prisma } from "../config/prisma";
import { withRetry } from "../utils/prismaRetry";
import { fetchContributions } from "../utils/github";
import authService from "./auth.service";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null;

class TelegramService {
  private ensureConfigured() {
    if (!API_BASE) {
      throw new Error("TELEGRAM_BOT_TOKEN не задан в .env");
    }
  }

  async sendMessage(chatId: string, text: string) {
    this.ensureConfigured();
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[telegram] sendMessage не удался: ${res.status} ${body}`);
    }
  }

  // Генерирует одноразовый код для привязки: пользователь открывает
  // t.me/<bot>?start=<code>, бот получает /start <code> в вебхуке
  async generateLinkCode(userId: string): Promise<{ code: string; botUsername: string | null }> {
    const code = crypto.randomBytes(8).toString("hex");
    await withRetry(() =>
      prisma.user.update({ where: { id: userId }, data: { telegramLinkCode: code } })
    );
    return { code, botUsername: process.env.TELEGRAM_BOT_USERNAME || null };
  }

  async unlink(userId: string) {
    await withRetry(() =>
      prisma.user.update({
        where: { id: userId },
        data: { telegramChatId: null, telegramLinkCode: null },
      })
    );
  }

  // Обработка входящего апдейта от Telegram (вебхук)
  async handleUpdate(update: any) {
    const message = update?.message;
    if (!message?.text) return;

    const chatId: string = String(message.chat.id);
    const text: string = message.text.trim();

    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const code = parts[1];

      if (!code) {
        await this.sendMessage(
          chatId,
          "Привет! Чтобы привязать аккаунт — открой профиль в Habit Grabbit и нажми «Подключить Telegram»."
        );
        return;
      }

      const user = await withRetry(() =>
        prisma.user.findFirst({ where: { telegramLinkCode: code } })
      );

      if (!user) {
        await this.sendMessage(chatId, "Код не найден или уже использован. Сгенерируй новый в профиле приложения.");
        return;
      }

      await withRetry(() =>
        prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: chatId, telegramLinkCode: null },
        })
      );

      await this.sendMessage(
        chatId,
        "✅ Готово! Telegram привязан. Буду напоминать, если ты не выполнишь дневную норму активности."
      );
      return;
    }

    // Любое другое сообщение — просто игнорируем/отвечаем заглушкой
    await this.sendMessage(chatId, "Я просто напоминаю о стриках в Habit Grabbit 🙂");
  }

  // Рассылка напоминаний тем, у кого есть привязанный Telegram,
  // включены уведомления и норма ещё не выполнена сегодня.
  // Вызывается либо по внутреннему таймеру, либо внешним cron-запросом
  // (см. /api/telegram/run-reminders) — это важно для Render free tier,
  // который засыпает и не может полагаться только на свой setInterval.
  async runReminders(): Promise<{ checked: number; sent: number }> {
    const users = await withRetry(() =>
      prisma.user.findMany({
        where: {
          telegramChatId: { not: null },
          notifyAboutGoal: true,
          dailyGoal: { gt: 0 },
        },
      })
    );

    let sent = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    for (const user of users) {
      try {
        // Уже напоминали сегодня — пропускаем, чтобы не спамить
        // при частом запуске cron (например, раз в 15 минут)
        const alreadySentToday =
          user.lastReminderSentAt &&
          user.lastReminderSentAt.toISOString().slice(0, 10) === todayStr;
        if (alreadySentToday) continue;

        const account = await authService.getGithubAccount(user.id);
        if (!account) continue;

        const days = await fetchContributions(
          account.login,
          account.accessToken,
          startOfDay.toISOString(),
          new Date().toISOString()
        );
        const todayContributions = days.find((d) => d.date === todayStr)?.contributionCount ?? 0;

        if (todayContributions < user.dailyGoal) {
          await this.sendMessage(
            user.telegramChatId as string,
            `🔥 Не забудь про дневную норму в Habit Grabbit! Сегодня: ${todayContributions}/${user.dailyGoal}. Ещё есть время.`
          );
          await withRetry(() =>
            prisma.user.update({
              where: { id: user.id },
              data: { lastReminderSentAt: new Date() },
            })
          );
          sent++;
        }
      } catch (err) {
        console.error(`[telegram] Ошибка напоминания для ${user.id}:`, err);
      }
    }

    return { checked: users.length, sent };
  }
}

export default new TelegramService();