import { Router } from "express";
import goalController from "../controllers/goal.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", goalController.getGoals);
router.post("/", goalController.createGoal);
router.patch("/:id", goalController.updateGoal);
router.delete("/:id", goalController.deleteGoal);

export default router;
