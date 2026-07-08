import { Response } from "express";
import columnService from "../services/column.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class ColumnController {
  async getColumns(req: AuthRequest, res: Response) {
    const columns = await columnService.getColumns(req.user!.id);
    return res.json(columns);
  }

  async createColumn(req: AuthRequest, res: Response) {
    const { title } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ message: "title is required" });
    }
    const column = await columnService.createColumn(req.user!.id, title);
    return res.status(201).json(column);
  }

  async updateColumn(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const column = await columnService.getColumnById(id);
    if (!column || column.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const updated = await columnService.updateColumn(id, req.body);
    return res.json(updated);
  }

  async deleteColumn(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const column = await columnService.getColumnById(id);
    if (!column || column.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await columnService.deleteColumn(id);
    return res.status(204).send();
  }
}

export default new ColumnController();
