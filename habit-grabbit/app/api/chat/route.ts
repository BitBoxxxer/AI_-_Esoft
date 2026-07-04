import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { generateAIResponse } from "@/lib/ai";
import type { AIChatMessage } from "@/lib/ai";

const SYSTEM_PROMPT = `Ты - персональный ассистент разработчика в приложении Habit GRabbit.
Твоя задача - помогать пользователю быть продуктивным, анализировать его активность на GitHub,
давать советы, хвалить за серии продуктивных дней и мягко бороться с прокрастинацией.
Твой стиль - дружелюбный, мотивирующий, как у Duolingo.
Отвечай на русском языке, коротко и вдохновляюще.`;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { message, memory = 10, conversationId } = await request.json();
  if (!message || typeof message !== "string") {
    return new Response("Message required", { status: 400 });
  }

  // Ограничим память разумными пределами
  const historyLimit = Math.min(Math.max(memory, 0), 50); // 0..50

  try {
    const history = await prisma.chatMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: historyLimit,
    });

    const aiMessages: AIChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }))
        .reverse(),
      { role: "user", content: message },
    ];

    const reply = await generateAIResponse(aiMessages, "llama3.1:8b");

    await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        conversationId,
        role: "user",
        content: message,
      },
    });

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        conversationId,
        role: "assistant",
        content: reply,
      },
    });

    return new Response(
      JSON.stringify({ reply, messageId: assistantMessage.id }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response("Internal error", { status: 500 });
  }
}