import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
  return new Response(JSON.stringify(conversations));
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const conv = await prisma.conversation.create({
    data: { userId: session.user.id, title: "Новый диалог" },
    select: { id: true, title: true, updatedAt: true },
  });
  return new Response(JSON.stringify(conv), { status: 201 });
}