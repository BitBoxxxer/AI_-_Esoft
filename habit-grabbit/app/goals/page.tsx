"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetCommits: number | null;
  targetPRs: number | null;
  targetIssues: number | null;
  deadline: string | null;
  completed: boolean;
  githubIssueUrl: string | null;
}

export default function GoalsPage() {
  const { data: session, status } = useSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login");
    if (status === "authenticated") fetchGoals();
  }, [status]);

  const fetchGoals = async () => {
    const res = await fetch("/api/goals");
    if (res.ok) setGoals(await res.json());
  };

  const createGoal = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    if (res.ok) {
      setNewTitle("");
      fetchGoals();
    }
    setLoading(false);
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    fetchGoals();
  };

  const deleteGoal = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    fetchGoals();
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">🎯 Мои цели</h1>

      {/* Добавление цели */}
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Название новой цели..."
          className="flex-1 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
          onKeyDown={(e) => e.key === "Enter" && createGoal()}
        />
        <button
          onClick={createGoal}
          disabled={loading || !newTitle.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2 rounded-lg transition font-medium"
        >
          Добавить
        </button>
      </div>

      {/* Список */}
      <div className="grid gap-4">
        {goals.length === 0 && (
          <p className="text-gray-400">Пока нет целей. Создай первую!</p>
        )}
        {goals.map((goal) => (
          <div
            key={goal.id}
            className={`bg-gray-900 rounded-xl p-4 flex items-start gap-4 border transition ${
              goal.completed ? "border-green-600/50" : "border-gray-800"
            }`}
          >
            <input
                type="checkbox"
                checked={goal.completed}
                onChange={() => toggleComplete(goal.id, goal.completed)}
                className="mt-1 w-5 h-5 accent-green-600 cursor-pointer"
                aria-label={`Отметить цель «${goal.title}» как ${goal.completed ? 'невыполненную' : 'выполненную'}`}
                title={`Отметить цель «${goal.title}» как ${goal.completed ? 'невыполненную' : 'выполненную'}`}
                />
            <div className="flex-1 min-w-0">
              <h3
                className={`text-lg font-medium truncate ${
                  goal.completed ? "line-through text-gray-500" : "text-white"
                }`}
              >
                {goal.title}
              </h3>
              {goal.description && (
                <p className="text-sm text-gray-400 mt-1">{goal.description}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {goal.deadline && (
                  <span className="text-xs text-gray-500">
                    🗓️ {new Date(goal.deadline).toLocaleDateString()}
                  </span>
                )}
                {goal.githubIssueUrl && (
                  <a
                    href={goal.githubIssueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline"
                  >
                    🔗 GitHub Issue
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => deleteGoal(goal.id)}
              className="text-gray-500 hover:text-red-400 transition shrink-0"
              title="Удалить цель"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}