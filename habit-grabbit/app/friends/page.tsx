"use client";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import BackToDashboardButton from "@/components/BackToDashboardButton";

interface WatchedItem {
  id: string;
  githubLogin: string;
}

interface Suggestion {
  login: string;
  name: string | null;
  avatarUrl: string;
}

interface Activity {
  id: string;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
  streak: number;
  last30Days: { date: string; contributionCount: number }[];
}

export default function FriendsPage() {
  const status = useRequireAuth();
  const [watched, setWatched] = useState<WatchedItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [manualLogin, setManualLogin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [watchedRes, suggestionsRes] = await Promise.all([
      apiFetch("/api/watched"),
      apiFetch("/api/watched/suggestions"),
    ]);
    if (watchedRes.ok) setWatched(await watchedRes.json());
    if (suggestionsRes.ok) setSuggestions(await suggestionsRes.json());
  }, []);

  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    const res = await apiFetch("/api/watched/activity");
    if (res.ok) setActivity(await res.json());
    setLoadingActivity(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      loadAll();
      loadActivity();
    }
  }, [status, loadAll, loadActivity]);

  const addUser = async (login: string) => {
    setError(null);
    const res = await apiFetch("/api/watched", {
      method: "POST",
      body: JSON.stringify({ githubLogin: login }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Не удалось добавить");
      return;
    }
    setManualLogin("");
    await loadAll();
    await loadActivity();
  };

  const removeUser = async (id: string) => {
    await apiFetch(`/api/watched/${id}`, { method: "DELETE" });
    await loadAll();
    await loadActivity();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Загрузка...
      </div>
    );
  }

  return (
    <main className="p-6 max-w-4xl mx-auto text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Активность друзей</h1>
        <BackToDashboardButton />
      </div>

      {/* Добавить вручную */}
      <section className="bg-gray-900 rounded-xl p-4 mb-6">
        <h2 className="text-lg font-medium mb-3">Добавить по логину</h2>
        <div className="flex gap-2">
          <input
            value={manualLogin}
            onChange={(e) => setManualLogin(e.target.value)}
            placeholder="Например: octocat"
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={() => manualLogin.trim() && addUser(manualLogin.trim())}
            className="px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-500 transition"
          >
            Добавить
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </section>

      {/* Предложения из подписок GitHub */}
      {suggestions.length > 0 && (
        <section className="bg-gray-900 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-medium mb-3">
            Из твоих подписок / подписчиков на GitHub
          </h2>
          <div className="flex flex-wrap gap-3">
            {suggestions.slice(0, 12).map((s) => (
              <button
                key={s.login}
                onClick={() => addUser(s.login)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-full pl-1 pr-3 py-1 text-sm transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.avatarUrl}
                  alt={s.login}
                  className="w-6 h-6 rounded-full"
                />
                {s.login}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Список отслеживаемых + их активность */}
      <section className="bg-gray-900 rounded-xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Отслеживаемые</h2>
          {loadingActivity && (
            <span className="text-sm text-gray-400">Обновляю...</span>
          )}
        </div>

        {watched.length === 0 && (
          <p className="text-gray-400 text-sm">
            Пока никого не отслеживаешь — добавь друзей выше.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {watched.map((w) => {
            const act = activity.find((a) => a.id === w.id);
            return (
              <div
                key={w.id}
                className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {act?.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={act.avatarUrl}
                      alt={w.githubLogin}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{act?.name || w.githubLogin}</p>
                    <p className="text-sm text-gray-400">@{w.githubLogin}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-orange-400 font-semibold">
                      🔥 {act?.streak ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">дней стрика</p>
                  </div>
                  <button
                    onClick={() => removeUser(w.id)}
                    className="text-gray-400 hover:text-red-400 text-sm"
                  >
                    Убрать
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
