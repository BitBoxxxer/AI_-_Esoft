import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// Обновить название колонки
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const column = await prisma.goalColumn.findUnique({ where: { id: params.id } });
  if (!column || column.userId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  const { title, order } = await request.json();
  const update: any = {};
  if (title !== undefined) update.title = title;
  if (order !== undefined) update.order = order;

  const updated = await prisma.goalColumn.update({
    where: { id: params.id },
    data: update,
  });
  return Response.json(updated);
}

// Удалить колонку (цели без колонки станут не видны, но мы перенесём их в "без колонки"?)
// Лучше удалить все цели колонки или перенести в другую. Сделаем предупреждение на клиенте.
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const column = await prisma.goalColumn.findUnique({ where: { id: params.id } });
  if (!column || column.userId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  // Удалим цели этой колонки
  await prisma.goal.deleteMany({ where: { columnId: params.id } });
  await prisma.goalColumn.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 });
}