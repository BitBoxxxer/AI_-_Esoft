import { Response } from "express";
import userService from "../services/user.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class UserController {
  async getProfile(req: AuthRequest, res: Response) {
    const user = await userService.getProfile(req.user!.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  }

  async updateProfile(req: AuthRequest, res: Response) {
    const user = await userService.updateProfile(req.user!.id, req.body);
    return res.json(user);
  }

  async updateGoal(req: AuthRequest, res: Response) {
    const { dailyGoal } = req.body;
    if (typeof dailyGoal !== "number" || dailyGoal < 0 || dailyGoal > 100) {
      return res.status(400).json({ message: "Invalid goal value" });
    }
    await userService.updateDailyGoal(req.user!.id, dailyGoal);
    return res.json({ success: true });
  }
}

export default new UserController();
