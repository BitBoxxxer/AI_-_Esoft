import { prisma } from "../config/prisma";
import { withRetry } from "../utils/prismaRetry";

class MessageService {
  async getMessageById(id: string) {
    return withRetry(() => prisma.chatMessage.findUnique({ where: { id } }));
  }

  async editMessage(id: string, conversationId: string, createdAt: Date, content: string) {
    await withRetry(() => prisma.chatMessage.update({ where: { id }, data: { content } }));
    await withRetry(() =>
      prisma.chatMessage.deleteMany({
        where: { conversationId, createdAt: { gt: createdAt } },
      })
    );
    await withRetry(() =>
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      })
    );
  }
}

export default new MessageService();
