"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const presets = [
  { label: "Лёгкая", value: 1 },
  { label: "Средняя", value: 4 },
  { label: "Сложная", value: 8 },
];

interface GoalSetterProps {
  currentGoal: number;
  onUpdated?: () => void; // опционально, но будем использовать router.refresh
}

export default function GoalSetter({ currentGoal }: GoalSetterProps) {
  const [customValue, setCustomValue] = useState(currentGoal || "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const saveGoal = async (goal: number) => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyGoal: goal }),
      });
      if (res.ok) {
        router.refresh(); // обновим серверный компонент дашборда
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-black text-white rounded-xl shadow p-4 w-full">
      <p className="text-sm text-gray-300 mb-2">
        {currentGoal > 0 ? "Изменить дневную норму" : "Задать дневную норму"}
      </p>

      {/* Предустановленные сложности */}
      <div className="flex gap-2 mb-3">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => saveGoal(p.value)}
            disabled={saving}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              currentGoal === p.value
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
            }`}
          >
            {p.label} ({p.value})
          </button>
        ))}
      </div>

      {/* Ручной ввод */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="100"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="Своё"
          className="w-20 px-2 py-1 rounded bg-gray-800 text-white border border-gray-600 text-sm"
        />
        <button
          onClick={() => {
            const num = parseInt(customValue as string, 10);
            if (!isNaN(num) && num >= 0) saveGoal(num);
          }}
          disabled={saving}
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm"
        >
          ОК
        </button>
      </div>

      {currentGoal > 0 && (
        <button
          onClick={() => saveGoal(0)}
          className="mt-3 text-xs text-gray-400 hover:text-white underline"
        >
          Отключить дневную норму
        </button>
      )}
    </div>
  );
}