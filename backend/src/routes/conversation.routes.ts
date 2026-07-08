import { Router } from "express";
import conversationController from "../controllers/conversation.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", conversationController.getConversations);
router.post("/", conversationController.createConversation);
router.get("/:id/messages", conversationController.getMessages);

export default router;
