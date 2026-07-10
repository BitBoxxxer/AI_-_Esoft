"use client";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useRequireAuth } from "@/lib/useRequireAuth";
import StreakBadge from "@/components/StreakBadge";
import GoalRing from "@/components/GoalRing";
import RefreshStatsButton from "@/components/RefreshStatsButton";
import SignOutButton from "@/components/SignOutButton";
import GoalSetter from "@/components/GoalSetter";
import Graph3D from "@/components/Graph3D";
import FriendsWidget from "@/components/FriendsWidget";
import NotificationBell from "@/components/NotificationBell";

interface DashboardUser {
  name: string | null;
  image: string | null;
  githubLogin: string | null;
  dailyGoal: number;
  notifyAboutGoal: boolean;
}

interface StatRow {
  date: string;
  contributions: number;
  commits: number;
  prs: number;
  issues: number;
}

export default function DashboardPage() {
  const status = useRequireAuth();
  const { user: authUser } = useAuth();
  const [dashUser, setDashUser] = useState<DashboardUser | null>(null);
  const [stats, setStats] = useState<StatRow[]>([]);

  const loadDashboard = useCallback(async () => {
    const res = await apiFetch("/api/stats/dashboard");
    if (res.ok) {
      const data = await res.json();
      setDashUser(data.user);
      setStats(data.stats);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") loadDashboard();
  }, [status, loadDashboard]);

  if (status === "loading" || !dashUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Загрузка...
      </div>
    );
  }

  const dailyGoal = dashUser.dailyGoal ?? 0;
  const parsedStats = stats.map((s) => ({ ...s, date: new Date(s.date) }));
  const streak = calculateStreak(parsedStats);

  // "Сегодня" — самая свежая дата, которую реально прислал GitHub (уже в
  // таймзоне самого аккаунта), а не часы браузера/сервера в UTC. Иначе ночью
  // в таймзонах восточнее UTC кажется, что сегодняшних данных ещё нет, хотя
  // GitHub их уже отдал.
  const latestStat = [...parsedStats].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  )[0];
  const todayContributions = latestStat?.contributions ?? 0;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      {/* Шапка с аватаром и кнопками */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {(dashUser.image || authUser?.image) && (
            <img
              src={dashUser.image || authUser?.image || ""}
              alt="avatar"
              className="w-20 h-20 rounded-full border-2 border-gray-600"
            />
          )}
          <h1 className="text-3xl font-bold text-white">
            Привет, {dashUser.githubLogin || dashUser.name}!
          </h1>
        </div>
        <div className="flex gap-2">
          <a
            href="/friends"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition text-sm"
          >
            Друзья
          </a>
          <a
            href="/profile"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition text-sm"
          >
            Профиль
          </a>
          <NotificationBell />
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
          <RefreshStatsButton onRefreshed={loadDashboard} />
          <SignOutButton />
        </div>
      </div>

      {/* Карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StreakBadge streak={streak} atRisk={todayContributions === 0} />

        {dailyGoal > 0 ? (
          <GoalRing done={todayContributions} goal={dailyGoal} />
        ) : (
          <GoalSetter currentGoal={0} onUpdated={loadDashboard} />
        )}

        <div className="bg-black text-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-300">Совет дня</p>
          <p className="text-white mt-1 text-sm">
            {getDailyAdvice(streak, todayContributions, dailyGoal)}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Советы от AI появятся позже -_-
          </p>
        </div>
      </div>

      {/* Редактирование цели (если уже задана) */}
      {dailyGoal > 0 && (
        <div className="mb-4">
          <GoalSetter currentGoal={dailyGoal} onUpdated={loadDashboard} />
        </div>
      )}

      {/* 3D-график активности + отслеживаемые друзья */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-black rounded-xl shadow p-4 lg:col-span-2 max-w-3xl mx-auto lg:mx-0 w-full">
          <Graph3D />
        </section>
        <FriendsWidget />
      </div>
    </main>
  );
}

// Функция подсчёта streak
function calculateStreak(
  stats: { date: Date; contributions: number }[]
): number {
  if (stats.length === 0) return 0;
  const sorted = [...stats].sort((a, b) => b.date.getTime() - a.date.getTime());
  let streak = 0;
  // "Сегодня" — самая свежая запись, а не системные часы: GitHub формирует
  // календарь контрибуций в таймзоне аккаунта, а не в UTC, так что сверяться
  // с new Date() на сервере/в браузере ненадёжно (см. calculateStreakFromDays
  // на бэкенде — та же идея).
  const todayStat = sorted[0];
  const today = new Date(todayStat.date);
  today.setUTCHours(0, 0, 0, 0);
  const checkDate = new Date(today);
  // Важно: проверяем не наличие записи за сегодня (она почти всегда есть,
  // просто с contributions: 0, пока не покоммитил), а именно наличие
  // активности. Иначе стрик за вчера/позавчера ошибочно обнулялся бы
  // в момент, когда сегодняшний рабочий день ещё не начался.
  const todayHasActivity = (todayStat?.contributions ?? 0) > 0;
  if (!todayHasActivity) {
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

function getDailyAdvice(
  streak: number,
  todayContributions: number,
  dailyGoal: number
): string {
  if (!dailyGoal) {
    if (streak === 0 && todayContributions === 0) {
      return "Сегодня новый день! Сделай первый шаг, один коммит запустит твой страйк.";
    }
    if (streak === 0 && todayContributions > 0) {
      return "Отлично, активность есть! Продолжай чтобы начать стрик.";
    }
    if (streak === 1) {
      return "Первый день стрика! Завтра будет второй - ты сможешь!";
    }
    if (streak >= 2 && streak <= 6) {
      return `Стрик ${streak} дней подряд! Вот это да, не сдавайся.`;
    }
    if (streak >= 7 && streak <= 30) {
      return `Огонь! ${streak} дней без перерыва. Ты входишь в ритм профи.`;
    }
    return `🔥 ${streak} дней! МАШИНА.`;
  }

  const progressPercent = Math.round((todayContributions / dailyGoal) * 100);
  const remaining = dailyGoal - todayContributions;

  if (todayContributions >= dailyGoal) {
    return streak > 0
      ? `GOOD Норма выполнена на ${progressPercent}%! И страйк ${streak} дней - ты крут.`
      : `Дневная норма выполнена на ${progressPercent}%!`;
  }

  if (progressPercent >= 50) {
    return streak > 0
      ? `Ты прошёл ${progressPercent}% цели (${todayContributions}/${dailyGoal}) при стрике ${streak} дней. ДОЖИМАЙ`
      : `Уже ${progressPercent}% нормы. Осталось ${remaining} действий - ДОЖИМАЙ МАШИНА`;
  }

  if (todayContributions > 0) {
    return streak > 0
      ? `Начало положено: ${todayContributions}/${dailyGoal}. Стрик ${streak} дней ждёт продолжения.`
      : `Сегодня ${todayContributions}/${dailyGoal}. Продолжай в том же духе, чтобы закрыть норму.`;
  }

  return streak > 0
    ? `Стрик ${streak} дней под угрозой! У тебя ещё есть время сделать ${dailyGoal} действий.`
    : "День только начался! Поставь себе цель выполнить дневную норму и начни с одного коммита.";
}
