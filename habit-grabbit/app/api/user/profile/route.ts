import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, dailyGoal: true, notifyAboutGoal: true },
  });
  return Response.json(user);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const body = await request.json();
  const updateData: Record<string, unknown> = {};
  if (typeof body.dailyGoal === "number") updateData.dailyGoal = body.dailyGoal;
  if (typeof body.notifyAboutGoal === "boolean") updateData.notifyAboutGoal = body.notifyAboutGoal;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true, image: true, dailyGoal: true, notifyAboutGoal: true },
  });
  return Response.json(user);
}