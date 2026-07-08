import { Response } from "express";
import chatService from "../services/chat.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class ChatController {
  async sendMessage(req: AuthRequest, res: Response) {
    const { message, memory = 10, conversationId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message required" });
    }
    if (!conversationId || typeof conversationId !== "string") {
      return res.status(400).json({ message: "conversationId required" });
    }

    try {
      const result = await chatService.sendMessage(
        req.user!.id,
        message,
        conversationId,
        memory
      );
      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal error" });
    }
  }
}

export default new ChatController();
