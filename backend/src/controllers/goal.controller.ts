import { Response } from "express";
import goalService from "../services/goal.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class GoalController {
  async getGoals(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const goals = await goalService.getGoals(userId);
    return res.json(goals);
  }

  async createGoal(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const goal = await goalService.createGoal(userId, req.body);
    return res.status(201).json(goal);
  }

  async updateGoal(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    const goal = await goalService.getGoalById(id);
    if (!goal || goal.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updated = await goalService.updateGoal(id, req.body);
    return res.json(updated);
  }

  async deleteGoal(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    const goal = await goalService.getGoalById(id);
    if (!goal || goal.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await goalService.deleteGoal(id);
    return res.status(204).send();
  }
}

export default new GoalController();
