// app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import StreakBadge from "@/components/StreakBadge";
import GoalRing from "@/components/GoalRing";
import RefreshStatsButton from "@/components/RefreshStatsButton";
import SignOutButton from "@/components/SignOutButton";
import GoalSetter from "@/components/GoalSetter";
import ActivityView from "@/components/ActivityView";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <div>Вы не авторизованы. Пожалуйста, войдите.</div>;
  }

  // Получаем dailyGoal пользователя
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dailyGoal: true },
  });
  const dailyGoal = user?.dailyGoal ?? 0;

  // Начальная загрузка: последние 365 дней (для быстрого рендера)
  const stats = await prisma.dailyStats.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 365,
  });

  const streak = calculateStreak(stats);

  // Сегодняшние данные для дневной нормы
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStats = stats.find(
    (s) => s.date.toISOString().slice(0, 10) === todayStr
  );
  const todayContributions = todayStats?.contributions ?? 0;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      {/* Шапка с аватаром и кнопками */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {session.user?.image && (
            <img
              src={session.user.image}
              alt="avatar"
              className="w-20 h-20 rounded-full border-2 border-gray-600"
            />
          )}
          <h1 className="text-3xl font-bold text-white">
            Привет, {session.user.login || session.user.name}!
          </h1>
        </div>
        <div className="flex gap-2">
          <RefreshStatsButton />
          <SignOutButton />
        </div>
      </div>

      {/* Карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StreakBadge streak={streak} />

        {dailyGoal > 0 ? (
          <GoalRing done={todayContributions} goal={dailyGoal} />
        ) : (
          <GoalSetter currentGoal={0} />
        )}

        <div className="bg-black text-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-300">Совет дня</p>
          <p className="text-white mt-1 text-sm">
            {streak > 0
              ? `Огонь! У тебя стрик ${streak} ${streak === 1 ? "день" : "дней"}. Продолжай в том же духе!`
              : "Сделай первый коммит сегодня, чтобы начать стрик!"}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            ⚡ Персональный AI-совет появится позже
          </p>
        </div>
      </div>

      {/* Редактирование цели (если уже задана) */}
      {dailyGoal > 0 && (
        <div className="mb-4">
          <GoalSetter currentGoal={dailyGoal} />
        </div>
      )}

      {/* Блок активности с переключателем периодов */}
      <section className="bg-black rounded-xl shadow p-4">
        <ActivityView initialStats={stats} />
      </section>
    </main>
  );
}

// Функция подсчёта streak (оставляем как была)
function calculateStreak(
  stats: { date: Date; contributions: number }[]
): number {
  if (stats.length === 0) return 0;
  const sorted = [...stats].sort((a, b) => b.date.getTime() - a.date.getTime());
  let streak = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let checkDate = new Date(today);
  const todayStat = sorted.find(
    (s) => s.date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)
  );
  if (!todayStat) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }
  for (const stat of sorted) {
    const statDate = new Date(stat.date);
    statDate.setUTCHours(0, 0, 0, 0);
    if (statDate.getTime() === checkDate.getTime()) {
      if (stat.contributions > 0) {
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