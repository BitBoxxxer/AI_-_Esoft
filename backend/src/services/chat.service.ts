import { prisma } from "../config/prisma";
import { generateAIResponse, AIChatMessage } from "../utils/ai";
import { withRetry } from "../utils/prismaRetry";

const SYSTEM_PROMPT = `Ты - персональный ассистент разработчика в приложении Habit GRabbit.
Твоя задача - помогать пользователю быть продуктивным, анализировать его активность на GitHub,
давать советы, хвалить за серии продуктивных дней и мягко бороться с прокрастинацией.
Твой стиль - дружелюбный, мотивирующий, как у Duolingo.
Отвечай на русском языке, коротко и вдохновляюще.`;

class ChatService {
  async sendMessage(userId: string, message: string, conversationId: string, memory: number) {
    const historyLimit = Math.min(Math.max(memory, 0), 50);

    const history = await withRetry(() =>
      prisma.chatMessage.findMany({
        where: { userId, conversationId },
        orderBy: { createdAt: "desc" },
        take: historyLimit,
      })
    );

    const aiMessages: AIChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content })).reverse(),
      { role: "user", content: message },
    ];

    const reply = await generateAIResponse(aiMessages);

    const userMessage = await withRetry(() =>
      prisma.chatMessage.create({ data: { userId, conversationId, role: "user", content: message } })
    );

    const assistantMessage = await withRetry(() =>
      prisma.chatMessage.create({ data: { userId, conversationId, role: "assistant", content: reply } })
    );

    await withRetry(() =>
      prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
    );

    return { reply, userMessageId: userMessage.id, messageId: assistantMessage.id };
  }
}

export default new ChatService();
