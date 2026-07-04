import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const onlyUnread = searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(onlyUnread ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return Response.json(notifications);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  // Отметить все как прочитанные
  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });
  return Response.json({ success: true });
}