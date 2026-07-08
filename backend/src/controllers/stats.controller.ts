import { Response } from "express";
import statsService, { HttpError } from "../services/stats.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class StatsController {
  async getStats(req: AuthRequest, res: Response) {
    const days = parseInt((req.query.days as string) || "365", 10);
    const stats = await statsService.getStats(req.user!.id, days);
    return res.json(stats);
  }

  async refreshStats(req: AuthRequest, res: Response) {
    try {
      const count = await statsService.refreshStats(req.user!.id);
      return res.json({ success: true, days: count });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error(error);
      return res.status(500).json({ message: "Error fetching contributions" });
    }
  }
}

export default new StatsController();
