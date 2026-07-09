import { Response } from "express";
import watchedService from "../services/watched.service";
import { HttpError } from "../services/stats.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class WatchedController {
  async list(req: AuthRequest, res: Response) {
    try {
      const items = await watchedService.list(req.user!.id);
      return res.json(items);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async add(req: AuthRequest, res: Response) {
    try {
      const { githubLogin } = req.body;
      if (!githubLogin || typeof githubLogin !== "string") {
        return res.status(400).json({ message: "githubLogin обязателен" });
      }
      const item = await watchedService.add(req.user!.id, githubLogin);
      return res.status(201).json(item);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async remove(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      await watchedService.remove(req.user!.id, id);
      return res.status(204).send();
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async suggestions(req: AuthRequest, res: Response) {
    try {
      const items = await watchedService.suggestions(req.user!.id);
      return res.json(items);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async activity(req: AuthRequest, res: Response) {
    try {
      const items = await watchedService.getActivity(req.user!.id);
      return res.json(items);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Внутренняя ошибка сервера" });
  }
}

export default new WatchedController();
