import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { fetchContributions } from "@/lib/github";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.login || !session?.user?.accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Получаем контрибуции за последние 365 дней
    const days = await fetchContributions(
      session.user.login,
      session.user.accessToken
    );

    // Сохраняем в БД
    for (const day of days) {
      await prisma.dailyStats.upsert({
        where: {
          userId_date: {
            userId: session.user.id,
            date: new Date(day.date + "T00:00:00Z"),
          },
        },
        update: {
          contributions: day.contributionCount,
        },
        create: {
          userId: session.user.id,
          date: new Date(day.date + "T00:00:00Z"),
          contributions: day.contributionCount,
          commits: 0,
          prs: 0,
          issues: 0,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, days: days.length }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Error fetching contributions", { status: 500 });
  }
}