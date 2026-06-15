"use client";
import { useState } from "react";
import Heatmap from "./Heatmap";
import type { DailyStats } from "@/types";

const periods = [
  { label: "Год", days: 365 },
  { label: "Месяц", days: 31 },
  { label: "Неделя", days: 7 },
];

export default function ActivityView({
  initialStats,
}: {
  initialStats: DailyStats[];
}) {
  const [stats, setStats] = useState(initialStats);
  const [activeDays, setActiveDays] = useState(365);
  const [loading, setLoading] = useState(false);

  const fetchStats = async (days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        const parsed = data.map((d: any) => ({
          ...d,
          date: new Date(d.date),
        }));
        setStats(parsed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (days: number) => {
    if (days === activeDays) return;
    setActiveDays(days);
    fetchStats(days);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Активность</h2>
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.days}
              onClick={() => handlePeriodChange(p.days)}
              disabled={loading}
              className={`px-3 py-1 rounded-lg text-sm transition ${
                activeDays === p.days
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl">
            <span className="text-white">Загрузка...</span>
          </div>
        )}
        <Heatmap data={stats} days={activeDays} />
      </div>
    </div>
  );
}