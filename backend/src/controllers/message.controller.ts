import { Response } from "express";
import messageService from "../services/message.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class MessageController {
  async editMessage(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ message: "Invalid content" });
    }

    const message = await messageService.getMessageById(id);
    if (!message || message.userId !== req.user!.id || message.role !== "user") {
      return res.status(403).json({ message: "Forbidden" });
    }

    await messageService.editMessage(id, message.conversationId, message.createdAt, content);

    return res.json({ success: true });
  }
}

export default new MessageController();
