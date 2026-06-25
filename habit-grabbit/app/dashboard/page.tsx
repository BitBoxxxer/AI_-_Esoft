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
          <a
            href="/goals"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition text-sm"
          >
            Цели
          </a>
          <a
            href="/chat"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition text-sm"
          >
            💬 AI
          </a>
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
          <p className="text-white mt-1 text-sm">{getDailyAdvice(streak, todayContributions, dailyGoal)}</p>
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

function getDailyAdvice(streak: number, todayContributions: number, dailyGoal: number): string {
  // Нет цели или цель 0 — советы без дневной нормы
  if (!dailyGoal) {
    if (streak === 0 && todayContributions === 0) {
      return "Сегодня новый день! Сделай первый шаг — один коммит запустит твой стрик.";
    }
    if (streak === 0 && todayContributions > 0) {
      return "Отлично, активность есть! Продолжай, чтобы начать стрик.";
    }
    if (streak === 1) {
      return "Первый день стрика! Завтра будет второй — ты сможешь!";
    }
    if (streak >= 2 && streak <= 6) {
      return `Стрик ${streak} дней подряд! Ты набираешь обороты, не сдавайся.`;
    }
    if (streak >= 7 && streak <= 30) {
      return `Огонь! ${streak} дней без перерыва. Ты входишь в ритм профи.`;
    }
    return `🔥 ${streak} дней! Ты — машина продуктивности.`;
  }

  // Когда дневная цель задана
  const progressPercent = Math.round((todayContributions / dailyGoal) * 100);
  const remaining = dailyGoal - todayContributions;

  if (todayContributions >= dailyGoal) {
    return streak > 0
      ? `🎉 Норма выполнена на ${progressPercent}%! И стрик ${streak} дней — ты супергерой.`
      : `✅ Дневная норма выполнена на ${progressPercent}%! Отличная работа.`;
  }

  if (progressPercent >= 50) {
    return streak > 0
      ? `Ты прошёл ${progressPercent}% цели (${todayContributions}/${dailyGoal}) при стрике ${streak} дней. Осталось чуть-чуть!`
      : `Уже ${progressPercent}% нормы. Осталось ${remaining} действий — дожми сегодня!`;
  }

  if (todayContributions > 0) {
    return streak > 0
      ? `Начало положено: ${todayContributions}/${dailyGoal}. Стрик ${streak} дней ждёт продолжения.`
      : `Сегодня ${todayContributions}/${dailyGoal}. Продолжай в том же духе, чтобы закрыть норму.`;
  }

  // 0 contributions
  return streak > 0
    ? `Стрик ${streak} дней под угрозой! У тебя ещё есть время сделать ${dailyGoal} действий.`
    : "День только начался! Поставь себе цель выполнить дневную норму и начни с одного коммита.";
}