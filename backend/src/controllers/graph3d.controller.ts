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
      // на другом порту (localhost:3000) как "NotSameOrigin", даже если запрос дошёл
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      // Кэш и на стороне браузера тоже — картинка и так обновляется редко
      res.setHeader("Cache-Control", "private, max-age=300");
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