export default function GoalRing({ progress }: { progress: number }) {
  return (
    <div className="bg-black text-white rounded-xl shadow p-4">
      <p className="text-sm text-gray-300">Дневная норма</p>
      <div className="text-3xl font-bold">{progress}%</div>
    </div>
  );
}