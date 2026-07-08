import { Router } from "express";
import messageController from "../controllers/message.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.patch("/:id", messageController.editMessage);

export default router;
