/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import BackToDashboardButton from "@/components/BackToDashboardButton";

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  githubIssueUrl: string | null;
  columnId: string;
}

interface Column {
  id: string;
  title: string;
  order: number;
  goals: Goal[];
}

export default function GoalsPage() {
  const status = useRequireAuth();
  const [columns, setColumns] = useState<Column[]>([]);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnTitle, setEditColumnTitle] = useState("");

  // Цели, которые редактируются
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState("");

  // Данные для быстрого добавления цели
  const [newGoalTitle, setNewGoalTitle] = useState<Record<string, string>>({});
  const [issueUrl, setIssueUrl] = useState<Record<string, string>>({});

  const fetchColumns = useCallback(async () => {
    const res = await apiFetch("/api/columns");
    if (res.ok) setColumns(await res.json());
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchColumns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Управление колонками
  const createColumn = async () => {
    if (!newColumnTitle.trim()) return;
    await apiFetch("/api/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newColumnTitle }),
    });
    setNewColumnTitle("");
    fetchColumns();
  };

  const startEditColumn = (col: Column) => {
    setEditingColumnId(col.id);
    setEditColumnTitle(col.title);
  };
  const saveColumnTitle = async (id: string) => {
    if (!editColumnTitle.trim()) return;
    await apiFetch(`/api/columns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editColumnTitle }),
    });
    setEditingColumnId(null);
    fetchColumns();
  };

  const deleteColumn = async (id: string) => {
    await apiFetch(`/api/columns/${id}`, { method: "DELETE" });
    fetchColumns();
  };

  // Управление целями
  const createGoal = async (columnId: string) => {
    const title = newGoalTitle[columnId];
    if (!title?.trim()) return;
    await apiFetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        columnId,
        githubIssueUrl: issueUrl[columnId] || null,
      }),
    });
    setNewGoalTitle((prev) => ({ ...prev, [columnId]: "" }));
    setIssueUrl((prev) => ({ ...prev, [columnId]: "" }));
    fetchColumns();
  };

  const toggleGoal = async (goal: Goal) => {
    await apiFetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !goal.completed }),
    });
    fetchColumns();
  };

  const startEditGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditGoalTitle(goal.title);
  };
  const saveGoalTitle = async (id: string) => {
    if (!editGoalTitle.trim()) return;
    await apiFetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editGoalTitle }),
    });
    setEditingGoalId(null);
    fetchColumns();
  };

  const updateGoalColumn = async (goalId: string, newColumnId: string) => {
    await apiFetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId: newColumnId }),
    });
    fetchColumns();
  };

  const deleteGoal = async (id: string) => {
    await apiFetch(`/api/goals/${id}`, { method: "DELETE" });
    fetchColumns();
  };

  if (status === "loading")
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Загрузка...</div>;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Мои цели</h1>
        <BackToDashboardButton />
      </div>

      {/* Управление колонками */}
      <div className="flex gap-2 mb-6">
        <input
        value={newColumnTitle}
        onChange={(e) => setNewColumnTitle(e.target.value)}
        placeholder="Название колонки"
        aria-label="Название новой колонки"
        className="px-3 py-2 rounded bg-gray-900 border border-gray-700 focus:border-blue-500 text-white placeholder-gray-400"
        onKeyDown={(e) => e.key === "Enter" && createColumn()}
      />
        <button
          onClick={createColumn}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded transition"
        >
          + Колонка
        </button>
      </div>

      {/* Доска */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.id}
            className="bg-gray-900 rounded-xl p-3 min-w-[250px] w-72 flex flex-col max-h-[80vh]"
          >
            {/* Заголовок колонки */}
            <div className="flex justify-between items-center mb-2">
              {editingColumnId === col.id ? (
                <input
                value={editColumnTitle}
                onChange={(e) => setEditColumnTitle(e.target.value)}
                onBlur={() => saveColumnTitle(col.id)}
                onKeyDown={(e) => e.key === "Enter" && saveColumnTitle(col.id)}
                aria-label="Редактировать название колонки"
                className="bg-gray-800 text-white px-2 py-1 rounded text-sm w-full"
                autoFocus
              />
              ) : (
                <h3
                  className="font-semibold text-sm cursor-pointer hover:text-blue-400"
                  onDoubleClick={() => startEditColumn(col)}
                >
                  {col.title}
                </h3>
              )}
              <button
                onClick={() => deleteColumn(col.id)}
                className="text-gray-400 hover:text-red-400 ml-1 text-lg leading-none"
                title="Удалить колонку"
              >
                ×
              </button>
            </div>

            {/* Карточки */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-2">
              {col.goals.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-gray-800 rounded-lg p-2 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={goal.completed}
                      onChange={() => toggleGoal(goal)}
                      className="mt-1 accent-green-500"
                      aria-label={`Отметить цель «${goal.title}»`}
                    />
                    <div className="flex-1 min-w-0">
                      {editingGoalId === goal.id ? (
                        <input
                        value={editGoalTitle}
                        onChange={(e) => setEditGoalTitle(e.target.value)}
                        onBlur={() => saveGoalTitle(goal.id)}
                        onKeyDown={(e) => e.key === "Enter" && saveGoalTitle(goal.id)}
                        className="bg-gray-700 text-white px-1 py-0.5 rounded w-full text-xs"
                        autoFocus
                        aria-label="Редактировать название цели"
                        title="Редактировать название цели"
                      />
                      ) : (
                        <span
                          className={`block cursor-pointer ${goal.completed ? "line-through text-gray-500" : ""}`}
                          onDoubleClick={() => startEditGoal(goal)}
                          title="Двойной клик - редактировать"
                        >
                          {goal.title}
                        </span>
                      )}

                      {/* Кнопки действий */}
                      <div className="flex mt-1 gap-1">
                        {/* Переместить в другую колонку */}
                        <select
                          value={goal.columnId}
                          onChange={(e) => updateGoalColumn(goal.id, e.target.value)}
                          className="bg-gray-700 text-xs text-gray-300 rounded px-1 py-0.5"
                          title="Переместить в колонку"
                        >
                          {columns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>

                        {/* Ссылка на GitHub issue */}
                        {goal.githubIssueUrl ? (
                          <a
                            href={goal.githubIssueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline ml-auto"
                          >
                            Issue
                          </a>
                        ) : (
                          <button
                            onClick={async () => {
                              const url = prompt("Введите ссылку на GitHub issue:");
                              if (url) {
                                await apiFetch(`/api/goals/${goal.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ githubIssueUrl: url }),
                                });
                                fetchColumns();
                              }
                            }}
                            className="text-xs text-gray-500 hover:text-blue-400 ml-auto"
                          >
                            + issue
                          </button>
                        )}
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="text-xs text-gray-500 hover:text-red-400"
                          title="Удалить цель"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Добавить задачу */}
            <div className="mt-auto pt-2 border-t border-gray-700">
              <input
                placeholder="Новая задача"
                value={newGoalTitle[col.id] || ""}
                onChange={(e) =>
                  setNewGoalTitle((prev) => ({ ...prev, [col.id]: e.target.value }))
                }
                className="w-full bg-gray-800 text-white text-xs px-2 py-1 rounded mb-1"
                onKeyDown={(e) => e.key === "Enter" && createGoal(col.id)}
              />
              <div className="flex gap-1">
                <input
                  placeholder="Issue URL (необязательно)"
                  value={issueUrl[col.id] || ""}
                  onChange={(e) =>
                    setIssueUrl((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  className="flex-1 bg-gray-800 text-xs text-gray-300 px-2 py-1 rounded"
                />
                <button
                  onClick={() => createGoal(col.id)}
                  className="bg-blue-600 hover:bg-blue-500 text-xs px-2 py-1 rounded transition"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}