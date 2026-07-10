import { Response } from "express";
import graph3DService from "../services/graph3d.service";
import { HttpError } from "../services/stats.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class Graph3DController {
  async getSvg(req: AuthRequest, res: Response) {
    try {
      const forceRefresh = req.query.refresh === "true";
      const svg = await graph3DService.getSvg(req.user!.id, forceRefresh);
      res.setHeader("Content-Type", "image/svg+xml");
      // Без этого браузер блокирует <img src="http://localhost:4000/..."> со страницы
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      // Картинка персональная (зависит от того, какой юзер/GitHub-аккаунт сейчас)
      res.setHeader("Cache-Control", "private, no-store, must-revalidate");
      return res.send(svg);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error(error);
      return res.status(500).json({ message: "Ошибка генерации графика" });
    }
  }
}

export default new Graph3DController();