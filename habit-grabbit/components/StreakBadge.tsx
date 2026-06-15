export default function StreakBadge({ streak }: { streak: number }) {
  return (
    <div className="bg-black text-white rounded-xl shadow p-4">
      <p className="text-sm text-gray-300">Текущий streak</p>
      <p className="text-3xl font-bold">{streak} дней</p>
    </div>
  );
}