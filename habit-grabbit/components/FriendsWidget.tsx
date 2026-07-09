"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface WatchedActivity {
  id: string;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
  streak: number;
}

const SITE_URL = "https://habit-grabbit.vercel.app/";

export default function FriendsWidget() {
  const [activity, setActivity] = useState<WatchedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch("/api/watched/activity");
    if (res.ok) setActivity(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // буфер обмена недоступен (например, нет https) — молча игнорируем
    }
  };

  return (
    <section className="bg-black rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Отслеживаемые друзья</h2>
        <Link
          href="/friends"
          className="text-sm text-blue-400 hover:text-blue-300 transition"
        >
          Все друзья →
        </Link>
      </div>

      {loading && (
        <p className="text-gray-400 text-sm">Загрузка...</p>
      )}

      {!loading && activity.length === 0 && (
        <div className="text-sm text-gray-400 space-y-2">
          <p>Пока никого не отслеживаешь.</p>
          <p>
            Добавить можно любого по GitHub-логину на странице{" "}
            <Link href="/friends" className="text-blue-400 hover:text-blue-300">
              Друзья
            </Link>
            . Регистрация в Habit Grabbit для этого не нужна — достаточно,
            чтобы у человека был аккаунт на GitHub.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-gray-500">Позвать друга:</span>
            <button
              onClick={copyLink}
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition text-xs"
            >
              {copied ? "Скопировано!" : "Скопировать ссылку"}
            </button>
          </div>
        </div>
      )}

      {!loading && activity.length > 0 && (
        <div className="flex flex-col gap-2">
          {activity.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.avatarUrl && (
                  <img
                    src={a.avatarUrl}
                    alt={a.githubLogin}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-white">
                    {a.name || a.githubLogin}
                  </p>
                  <p className="text-xs text-gray-400">@{a.githubLogin}</p>
                </div>
              </div>
              <p className="text-orange-400 text-sm font-semibold">
                🔥 {a.streak}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
