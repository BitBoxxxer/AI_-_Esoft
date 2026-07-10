import { Request, Response } from "express";
import badgeService from "../services/badge.service";

class BadgeController {
  // Публичный роут - без authMiddleware, GitHub вставляет картинки
  // в README без кук/токенов
  async getSvg(req: Request, res: Response) {
    try {
      const login = (req.params.login as string).replace(/\.svg$/i, "");
      if (!login) {
        return res.status(400).send("Не указан логин");
      }

      const svg = await badgeService.getSvg(login);
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      // Кэш подольше - это же чужой README, там всё равно долго не обновляется
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.send(svg);
    } catch (error) {
      console.error("[badge] Ошибка генерации:", error);
      return res.status(500).send("Ошибка генерации бейджа");
    }
  }
}

export default new BadgeController();
