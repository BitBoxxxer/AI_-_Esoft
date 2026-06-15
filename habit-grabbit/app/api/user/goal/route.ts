import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { dailyGoal } = await request.json();

  if (typeof dailyGoal !== "number" || dailyGoal < 0 || dailyGoal > 100) {
    return new Response("Invalid goal value", { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { dailyGoal },
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}