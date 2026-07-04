import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// + цель (отметить выполнение или изменить поля)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params; // promise
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal || goal.userId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (typeof body.completed === "boolean") updateData.completed = body.completed;
  if (body.title) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.deadline !== undefined)
    updateData.deadline = body.deadline ? new Date(body.deadline) : null;
  if (body.githubIssueUrl !== undefined) updateData.githubIssueUrl = body.githubIssueUrl;
  if (body.columnId !== undefined) updateData.columnId = body.columnId;
  //TODO: добавить targetCommits и т.д.

  const updated = await prisma.goal.update({
    where: { id },
    data: updateData,
  });
  return Response.json(updated);
}

// - цель
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal || goal.userId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  await prisma.goal.delete({ where: { id } });
  return new Response(null, { status: 204 });
}