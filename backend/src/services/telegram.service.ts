import crypto from "crypto";
import { prisma } from "../config/prisma";
import { withRetry } from "../utils/prismaRetry";
import { fetchContributions, calculateStreakFromDays } from "../utils/github";
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

  // Регистрирует список команд в самом Telegram-клиенте (подсказка при вводе "/").
  // Достаточно вызвать один раз после смены токена/списка команд - Telegram сам
  // хранит это на своей стороне. Можно дёргать при старте сервера.
  async setMyCommands() {
    if (!API_BASE) return; // бот не настроен - тихо пропускаем, не роняем сервер
    try {
      const res = await fetch(`${API_BASE}/setMyCommands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commands: [
            { command: "status", description: "Сегодняшний прогресс и текущий стрик" },
            { command: "help", description: "Что умеет бот и когда он пишет сам" },
            { command: "unlink", description: "Отвязать Telegram от Habit Grabbit" },
          ],
        }),
      });
      if (!res.ok) {
        console.warn(`[telegram] setMyCommands не удался: ${res.status}`);
      }
    } catch (err) {
      console.warn("[telegram] setMyCommands ошибка:", err);
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

  // (вебхук)
  async handleUpdate(update: any) {
    const message = update?.message;
    if (!message?.text) return;

    const chatId: string = String(message.chat.id);
    const text: string = message.text.trim();
    const command = text.split(" ")[0].split("@")[0];

    if (command === "/start") {
      await this.handleStart(chatId, text);
      return;
    }
    if (command === "/help") {
      await this.sendMessage(chatId, this.helpText());
      return;
    }
    if (command === "/status" || command === "/whoami" || command === "/me") {
      await this.handleStatus(chatId);
      return;
    }
    if (command === "/unlink") {
      await this.handleUnlinkCommand(chatId);
      return;
    }
    await this.sendMessage(
      chatId,
      "Не знаю такого, но я умею:\n\n" + this.helpText()
    );
  }

  private helpText(): string {
    return (
      "<b>Habit Grabbit Bot</b> - я слежу за твоим GitHub-стриком и напоминаю, если норма ещё не выполнена.\n\n" +
      "<b>Команды:</b>\n" +
      "/status - сегодняшний прогресс и текущий стрик\n" +
      "/help - это сообщение\n" +
      "/unlink - отвязать этот Telegram-аккаунт от Habit Grabbit\n\n" +
      "<b>Когда я пишу сам:</b>\n" +
      "Я проверяю твою активность на GitHub и, если к вечеру дневная норма ещё не закрыта, " +
      "присылаю одно напоминание - максимум раз в день, чтобы не спамить. " +
      "Если норма уже выполнена или уведомления выключены в профиле - молчу."
    );
  }

  private async handleStart(chatId: string, text: string) {
    const parts = text.split(" ");
    const code = parts[1];

    if (!code) {
      await this.sendMessage(
        chatId,
        "Привет! Я бот <b>Habit Grabbit</b> - присылаю напоминания, если ты не выполнил дневную норму активности на GitHub.\n\n" +
          "Чтобы привязать аккаунт: открой профиль в приложении и нажми «Подключить Telegram».\n\n" +
          "Команда /help покажет, что я ещё умею."
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
      "✅ Готово! Telegram привязан.\n\n" +
        "Буду напоминать максимум раз в день, если дневная норма активности ещё не выполнена. " +
        "Команда /status покажет твой сегодняшний прогресс прямо сейчас, /help - список команд."
    );
  }

  private async handleStatus(chatId: string) {
    const user = await withRetry(() =>
      prisma.user.findFirst({ where: { telegramChatId: chatId } })
    );

    if (!user) {
      await this.sendMessage(
        chatId,
        "Этот Telegram-аккаунт ещё не привязан. Открой профиль в Habit Grabbit и нажми «Подключить Telegram»."
      );
      return;
    }

    const account = await authService.getGithubAccount(user.id);
    if (!account) {
      await this.sendMessage(chatId, "Не могу получить данные GitHub - переподключи GitHub в приложении.");
      return;
    }

    const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();
    const days = await fetchContributions(account.login, account.accessToken, from, to);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayContributions = days.find((d) => d.date === todayStr)?.contributionCount ?? 0;
    const streak = calculateStreakFromDays(days);

    const goal = user.dailyGoal;
    const goalLine =
      goal > 0
        ? todayContributions >= goal
          ? `✅ Норма выполнена: ${todayContributions}/${goal}`
          : `⏳ Норма не выполнена: ${todayContributions}/${goal}`
        : "Дневная норма не задана (можно включить в профиле).";

    await this.sendMessage(
      chatId,
      `👤 @${account.login}\n` +
        `🔥 Стрик: ${streak} ${streak === 1 ? "день" : "дней"}\n` +
        `${goalLine}\n\n` +
        `Уведомления: ${user.notifyAboutGoal ? "включены" : "выключены"} (меняется в профиле приложения).`
    );
  }

  private async handleUnlinkCommand(chatId: string) {
    const user = await withRetry(() =>
      prisma.user.findFirst({ where: { telegramChatId: chatId } })
    );

    if (!user) {
      await this.sendMessage(chatId, "Этот Telegram-аккаунт и так не привязан ни к одному профилю.");
      return;
    }

    await withRetry(() =>
      prisma.user.update({ where: { id: user.id }, data: { telegramChatId: null } })
    );

    await this.sendMessage(chatId, "Отвязал. Больше напоминаний присылать не буду - можно снова подключиться в любой момент через профиль.");
  }

  // Рассылка напоминаний тем, у кого есть привязанный Telegram,
  // включены уведомления и норма ещё не выполнена сегодня.
  // Вызывается либо по внутреннему таймеру, либо внешним cron-запросом
  // (см. /api/telegram/run-reminders) - это важно для Render free tier,
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
        // Уже напоминали сегодня - пропускаем, чтобы не спамить
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