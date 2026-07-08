import { Router } from "express";
import notificationController from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", notificationController.getNotifications);
router.patch("/", notificationController.markAllAsRead);

export default router;
