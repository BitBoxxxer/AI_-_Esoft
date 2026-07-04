import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { content } = await request.json();
  if (!content || typeof content !== "string") return new Response("Invalid content", { status: 400 });

  // Находим сообщение и проверяем, что оно принадлежит пользователю и роль user
  const message = await prisma.chatMessage.findUnique({
    where: { id: params.id },
    include: { conversation: true },
  });
  if (!message || message.userId !== session.user.id || message.role !== "user") {
    return new Response("Forbidden", { status: 403 });
  }

  // Обновляем содержимое
  await prisma.chatMessage.update({
    where: { id: params.id },
    data: { content },
  });

  // Удаляем все сообщения в этом диалоге, созданные позже редактируемого
  await prisma.chatMessage.deleteMany({
    where: {
      conversationId: message.conversationId,
      createdAt: { gt: message.createdAt },
    },
  });

  // Обновляем updatedAt диалога
  await prisma.conversation.update({
    where: { id: message.conversationId },
    data: { updatedAt: new Date() },
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}