import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Получить все цели пользователя
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(goals);
}

// Создать новую цель
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { title, description, targetCommits, targetPRs, targetIssues, deadline, githubIssueUrl } =
    await request.json();

  const goal = await prisma.goal.create({
    data: {
      userId: session.user.id,
      title,
      description: description || null,
      targetCommits: targetCommits || null,
      targetPRs: targetPRs || null,
      targetIssues: targetIssues || null,
      deadline: deadline ? new Date(deadline) : null,
      githubIssueUrl: githubIssueUrl || null,
    },
  });
  return Response.json(goal, { status: 201 });
}