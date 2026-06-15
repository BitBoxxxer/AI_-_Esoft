interface GoalRingProps {
  done: number;      // сколько сделано сегодня
  goal: number;      // цель на день (0 = не задана)
}

export default function GoalRing({ done, goal }: GoalRingProps) {
  const hasGoal = goal > 0;
  const progress = hasGoal ? Math.min(100, Math.round((done / goal) * 100)) : 0;

  return (
    <div className="bg-black text-white rounded-xl shadow p-4">
      <p className="text-sm text-gray-300">
        {hasGoal ? "Дневная норма" : "Сегодня"}
      </p>
      {hasGoal ? (
        <>
          <div className="text-3xl font-bold mt-1">
            {done}/{goal}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {progress}% выполнено
          </div>
        </>
      ) : (
        <>
          <div className="text-3xl font-bold mt-1">
            {done}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {done > 0 ? "действий" : "пока тихо"}
          </div>
        </>
      )}
    </div>
  );
}