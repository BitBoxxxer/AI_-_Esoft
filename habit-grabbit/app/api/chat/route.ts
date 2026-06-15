import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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

  const { message } = await request.json();
  if (!message || typeof message !== "string") {
    return new Response("Message required", { status: 400 });
  }

  try {
    // Получаем последние 10 сообщений для контекста
    const history = await prisma.chatMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Формируем массив сообщений для AI
    // Приводим history к нужному типу
    const historyMessages = history
    .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
    }))
    .reverse();

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

    const reply = await generateAIResponse(aiMessages);

    // Сохраняем сообщение пользователя
    await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        role: "user",
        content: message,
      },
    });

    // Сохраняем ответ ассистента
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        role: "assistant",
        content: reply,
      },
    });

    return new Response(
      JSON.stringify({
        reply,
        messageId: assistantMessage.id,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response("Internal error", { status: 500 });
  }
}