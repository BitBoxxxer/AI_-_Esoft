interface StreakBadgeProps {
  streak: number;
  atRisk?: boolean; // стрик есть, но сегодня ещё нет активности
}

export default function StreakBadge({ streak, atRisk = false }: StreakBadgeProps) {
  const showWarning = atRisk && streak > 0;

  return (
    <div className="bg-black text-white rounded-xl shadow p-4">
      <p className="text-sm text-gray-300">Текущий streak</p>
      <p className={`text-3xl font-bold ${showWarning ? "text-yellow-400" : "text-white"}`}>
        {streak} дней
      </p>
      {showWarning && (
        <p className="text-yellow-400 text-xs mt-1">
          ⚠️ Сегодня ещё не было активности — позанимайся, чтобы не потерять стрик!
        </p>
      )}
    </div>
  );
}
