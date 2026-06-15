// app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Heatmap from "@/components/Heatmap";
import StreakBadge from "@/components/StreakBadge";
import GoalRing from "@/components/GoalRing";
import RefreshStatsButton from "@/components/RefreshStatsButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <div>Вы не авторизованы. Пожалуйста, войдите.</div>;
  }

  const stats = await prisma.dailyStats.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 365,
  });

  const streak = calculateStreak(stats);
  const progress = 65; // заглушка, пока не привязали цели

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Привет, {session.user.login || session.user.name}!
        </h1>
        <RefreshStatsButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StreakBadge streak={streak} />
        <GoalRing progress={progress} />
        <div className="bg-black text-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-300">Совет дня</p>
          <p className="text-white mt-1">
            Твой streak растёт, так держать! 🚀
          </p>
        </div>
      </div>

      <section className="bg-black rounded-xl shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Активность за год</h2>
        <Heatmap data={stats} />
      </section>
    </main>
  );
}

function calculateStreak(stats: { date: Date; commits: number; prs: number; issues: number }[]): number {
  if (stats.length === 0) return 0;
  const sorted = [...stats].sort((a, b) => b.date.getTime() - a.date.getTime());
  let streak = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let checkDate = new Date(today);
  const todayStat = sorted.find(s => s.date.toISOString().slice(0,10) === today.toISOString().slice(0,10));
  if (!todayStat) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }
  for (const stat of sorted) {
    const statDate = new Date(stat.date);
    statDate.setUTCHours(0, 0, 0, 0);
    if (statDate.getTime() === checkDate.getTime()) {
      const hasActivity = stat.commits > 0 || stat.prs > 0 || stat.issues > 0;
      if (hasActivity) {
        streak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    } else if (statDate.getTime() < checkDate.getTime()) {
      break;
    }
  }
  return streak;
}