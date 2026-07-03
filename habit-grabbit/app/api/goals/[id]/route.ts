import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Обновить цель (отметить выполнение или изменить поля)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const goal = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!goal || goal.userId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  const body = await request.json();
  const updateData: any = {};

  if (typeof body.completed === "boolean") updateData.completed = body.completed;
  if (body.title) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.deadline !== undefined)
    updateData.deadline = body.deadline ? new Date(body.deadline) : null;
  if (body.githubIssueUrl !== undefined) updateData.githubIssueUrl = body.githubIssueUrl;
  if (body.columnId !== undefined) updateData.columnId = body.columnId;
  // При желании можно добавить targetCommits и т.д.

  const updated = await prisma.goal.update({
    where: { id: params.id },
    data: updateData,
  });
  return Response.json(updated);
}

// Удалить цель
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const goal = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!goal || goal.userId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  await prisma.goal.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 });
}