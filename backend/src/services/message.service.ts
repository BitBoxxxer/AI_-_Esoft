import { prisma } from "../config/prisma";

class MessageService {
  async getMessageById(id: string) {
    return prisma.chatMessage.findUnique({ where: { id } });
  }

  async editMessage(id: string, conversationId: string, createdAt: Date, content: string) {
    await prisma.chatMessage.update({
      where: { id },
      data: { content },
    });

    // Удаляем все последующие сообщения диалога (ответ AI и всё, что было после)
    await prisma.chatMessage.deleteMany({
      where: {
        conversationId,
        createdAt: { gt: createdAt },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }
}

export default new MessageService();
