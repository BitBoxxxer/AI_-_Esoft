import { prisma } from "../config/prisma";

class ConversationService {
  async getConversations(userId: string) {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });
  }

  async createConversation(userId: string) {
    return prisma.conversation.create({
      data: { userId, title: "Новый диалог" },
      select: { id: true, title: true, updatedAt: true },
    });
  }

  async getMessages(conversationId: string, userId: string) {
    return prisma.chatMessage.findMany({
      where: { conversationId, userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });
  }

  async getConversationById(id: string) {
    return prisma.conversation.findUnique({ where: { id } });
  }
}

export default new ConversationService();
