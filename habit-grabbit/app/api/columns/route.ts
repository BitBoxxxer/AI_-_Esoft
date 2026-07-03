import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Все колонки пользователя
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const columns = await prisma.goalColumn.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
    include: {
      goals: { orderBy: { createdAt: "desc" } },
    },
  });
  return Response.json(columns);
}

// Создать колонку
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { title } = await request.json();
  // Определим следующий порядок
  const last = await prisma.goalColumn.findFirst({
    where: { userId: session.user.id },
    orderBy: { order: "desc" },
  });
  const order = last ? last.order + 1 : 0;

  const column = await prisma.goalColumn.create({
    data: {
      userId: session.user.id,
      title,
      order,
    },
  });
  return Response.json(column, { status: 201 });
}