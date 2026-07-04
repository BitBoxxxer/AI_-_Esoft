"use client";
import { useMemo } from "react";
import type { DailyStats } from "@/types";

function getIntensity(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 10) return 3;
  return 4;
}

const intensityColors: Record<number, string> = {
  0: "bg-gray-800",
  1: "bg-green-900",
  2: "bg-green-700",
  3: "bg-green-500",
  4: "bg-green-300",
};

export default function Heatmap({
  data,
  days = 365,
}: {
  data: DailyStats[];
  days?: number;
}) {
  const statsMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => {
      const dateObj = typeof d.date === "string" ? new Date(d.date) : d.date;
      if (isNaN(dateObj.getTime())) return;
      const key = dateObj.toISOString().slice(0, 10);
      const total = d.contributions ?? d.commits + d.prs + d.issues;
      map.set(key, (map.get(key) || 0) + total);
    });
    return map;
  }, [data]);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Начало периода: today - (days - 1) дней
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (days - 1));

  // Сдвигаем к понедельнику для красивой сетки
  const dayOfWeek = startDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + mondayOffset);

  const weeks: { date: string; count: number }[][] = [];
  const currentDate = new Date(startDate);
  let week: { date: string; count: number }[] = [];

  while (currentDate <= today) {
    const key = currentDate.toISOString().slice(0, 10);
    const count = statsMap.get(key) || 0;
    week.push({ date: key, count });

    if (currentDate.getDay() === 0) {
      weeks.push(week);
      week = [];
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  if (week.length > 0) {
    weeks.push(week);
  }

  const monthNames = [
    "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
    "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
  ];
  const monthLabels: { index: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, idx) => {
    const firstDay = w[0]?.date;
    if (firstDay) {
      const month = parseInt(firstDay.slice(5, 7), 10) - 1;
      if (month !== lastMonth) {
        monthLabels.push({ index: idx, label: monthNames[month] });
        lastMonth = month;
      }
    }
  });

  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs text-gray-300">Меньше</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-3 h-3 rounded-sm ${intensityColors[level]}`}
          />
        ))}
        <span className="text-xs text-gray-300">Больше</span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex">
          <div className="flex flex-col pt-5 pr-3">
            {["Пн", "", "Ср", "", "Пт", "", ""].map((day, i) => (
              <div key={i} className="h-5 flex items-center text-xs text-gray-300">
                {day}
              </div>
            ))}
          </div>

          <div>
            <div className="flex mb-1">
              {monthLabels.map((m, idx) => (
                <div
                  key={idx}
                  className="text-xs text-gray-300"
                  style={{
                    marginLeft:
                      idx === 0
                        ? m.index * 16
                        : (m.index - monthLabels[idx - 1].index) * 16,
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            <div className="flex gap-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`w-4 h-4 rounded-sm ${
                        intensityColors[getIntensity(day.count)]
                      }`}
                      title={`${day.date}: ${day.count} действий`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}