import { Router } from "express";
import statsController from "../controllers/stats.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", statsController.getStats);
router.get("/dashboard", statsController.getDashboard);
router.post("/refresh", statsController.refreshStats);

export default router;
