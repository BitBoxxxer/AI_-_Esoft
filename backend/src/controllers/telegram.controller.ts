import { Request, Response } from "express";
import telegramService from "../services/telegram.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class TelegramController {
  // Авторизованный роут — фронт вызывает, чтобы получить код привязки
  async linkCode(req: AuthRequest, res: Response) {
    try {
      const { code, botUsername } = await telegramService.generateLinkCode(req.user!.id);
      return res.json({ code, botUsername });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Не удалось сгенерировать код" });
    }
  }

  async unlink(req: AuthRequest, res: Response) {
    try {
      await telegramService.unlink(req.user!.id);
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Ошибка" });
    }
  }

  // Публичный вебхук — сюда стучится сам Telegram, проверяем секрет в query
  async webhook(req: Request, res: Response) {
    try {
      const secret = req.query.secret;
      if (!secret || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return res.status(403).send("Forbidden");
      }
      await telegramService.handleUpdate(req.body);
      return res.status(200).send("OK");
    } catch (error) {
      console.error("[telegram webhook]", error);
      // Telegram ретраит на ошибки — отвечаем 200, чтобы не спамил ретраями
      return res.status(200).send("OK");
    }
  }

  // Триггер рассылки напоминаний — вызывается внешним cron-сервисом
  // (см. инструкцию), защищён секретом в query
  async runReminders(req: Request, res: Response) {
    try {
      const secret = req.query.secret;
      if (!secret || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return res.status(403).send("Forbidden");
      }
      const result = await telegramService.runReminders();
      return res.json(result);
    } catch (error) {
      console.error("[telegram reminders]", error);
      return res.status(500).json({ message: "Ошибка рассылки" });
    }
  }
}

export default new TelegramController();
