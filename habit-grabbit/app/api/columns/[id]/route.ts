import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// Обновить название колонки
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params; // получаем id из Promise
  const column = await prisma.goalColumn.findUnique({ where: { id } });
  if (!column || column.userId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  const { title, order } = await request.json();
  const update: any = {};
  if (title !== undefined) update.title = title;
  if (order !== undefined) update.order = order;

  const updated = await prisma.goalColumn.update({
    where: { id },
    data: update,
  });
  return Response.json(updated);
}

// Удаление колонки
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const column = await prisma.goalColumn.findUnique({ where: { id } });
  if (!column || column.userId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  // удалить цели
  await prisma.goal.deleteMany({ where: { columnId: id } });
  await prisma.goalColumn.delete({ where: { id } });
  return new Response(null, { status: 204 });
}