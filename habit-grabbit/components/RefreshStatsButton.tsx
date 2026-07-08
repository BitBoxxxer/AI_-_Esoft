"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

interface RefreshStatsButtonProps {
  onRefreshed?: () => void;
}

export default function RefreshStatsButton({ onRefreshed }: RefreshStatsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await apiFetch("/api/stats/refresh", { method: "POST" });
      if (res.ok) {
        setMessage("Статистика обновлена!");
        if (onRefreshed) {
          onRefreshed();
        } else {
          window.location.reload();
        }
      } else {
        setMessage("Ошибка обновления");
      }
    } catch {
      setMessage("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={refresh}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
      >
        {loading ? "Обновляю..." : "Обновить статистику"}
      </button>
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
}
