import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "365", 10);

  const stats = await prisma.dailyStats.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: days,
  });

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}