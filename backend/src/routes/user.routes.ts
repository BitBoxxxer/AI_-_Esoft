import { Router } from "express";
import userController from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/profile", userController.getProfile);
router.patch("/profile", userController.updateProfile);
router.patch("/goal", userController.updateGoal);

export default router;
