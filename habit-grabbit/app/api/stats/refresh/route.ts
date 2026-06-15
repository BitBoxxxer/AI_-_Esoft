// app/api/stats/refresh/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { fetchGitHubEvents, aggregateStats } from "@/lib/github";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.login || !session?.user?.accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const allEvents = [];
    // Пробуем получить максимум страниц, пока не закончатся события
    for (let page = 1; page <= 10; page++) {
      const events = await fetchGitHubEvents(
        session.user.login,
        session.user.accessToken,
        100,
        page
      );
      allEvents.push(...events);
      if (events.length < 100) break;
    }

    const dailyStats = aggregateStats(allEvents);

    for (const stat of dailyStats) {
      await prisma.dailyStats.upsert({
        where: {
          userId_date: {
            userId: session.user.id,
            date: new Date(stat.date + "T00:00:00Z"),
          },
        },
        update: {
          commits: stat.commits,
          prs: stat.prs,
          issues: stat.issues,
        },
        create: {
          userId: session.user.id,
          date: new Date(stat.date + "T00:00:00Z"),
          commits: stat.commits,
          prs: stat.prs,
          issues: stat.issues,
          goalMet: false,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, days: dailyStats.length }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Error fetching stats", { status: 500 });
  }
}