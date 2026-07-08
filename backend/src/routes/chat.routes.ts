import { Router } from "express";
import chatController from "../controllers/chat.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", chatController.sendMessage);

export default router;
