import { Response } from "express";
import conversationService from "../services/conversation.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class ConversationController {
  async getConversations(req: AuthRequest, res: Response) {
    const conversations = await conversationService.getConversations(req.user!.id);
    return res.json(conversations);
  }

  async createConversation(req: AuthRequest, res: Response) {
    const conv = await conversationService.createConversation(req.user!.id);
    return res.status(201).json(conv);
  }

  async getMessages(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const conversation = await conversationService.getConversationById(id);
    if (!conversation || conversation.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const messages = await conversationService.getMessages(id, req.user!.id);
    return res.json(messages);
  }
}

export default new ConversationController();
