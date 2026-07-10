/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import BadgeSection from "@/components/BadgeSection";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  githubLogin: string | null;
  dailyGoal: number;
  notifyAboutGoal: boolean;
  telegramChatId?: string | null;
}

export default function ProfilePage() {
  const status = useRequireAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);

  
  const loadProfile = useCallback(async () => {
    const res = await apiFetch("/api/user/profile");
    if (res.ok) setProfile(await res.json());
  }, []); // пустой массив зависимостей, т.к. fetch и setProfile стабильны

  useEffect(() => {
    if (status === "authenticated") loadProfile();
  }, [status, loadProfile]);
  
  const toggleNotify = async () => {
    if (!profile) return;
    setLoading(true);
    const res = await apiFetch("/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ notifyAboutGoal: !profile.notifyAboutGoal }),
    });
    if (res.ok) setProfile(await res.json());
    setLoading(false);
  };

  const connectTelegram = async () => {
    const res = await apiFetch("/api/telegram/link-code", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setTelegramCode(data.code);
      setBotUsername(data.botUsername);
    }
  };

  const disconnectTelegram = async () => {
    await apiFetch("/api/telegram/unlink", { method: "POST" });
    setTelegramCode(null);
    await loadProfile();
  };

  if (status === "loading" || !profile)
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Загрузка...</div>;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="flex items-center justify-between mb-6 max-w-lg mx-auto">
        <h1 className="text-3xl font-bold">👤 Профиль</h1>
        <BackToDashboardButton />
      </div>

      <div className="bg-gray-900 rounded-xl p-6 max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {profile.image && (
            <img src={profile.image} alt="avatar" className="w-16 h-16 rounded-full border-2 border-blue-600" />
          )}
          <div>
            <h2 className="text-xl font-semibold">{profile.name || "Пользователь"}</h2>
            {profile.email && <p className="text-gray-400 text-sm">{profile.email}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Дневная норма</label>
            <p className="text-2xl font-bold">{profile.dailyGoal || "-"}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Напоминать о невыполненной норме</span>
            <button
            onClick={toggleNotify}
            disabled={loading}
            title={profile.notifyAboutGoal ? "Выключить напоминания о норме" : "Включить напоминания о норме"}
            className={`w-12 h-6 rounded-full transition relative ${
                profile.notifyAboutGoal ? "bg-green-600" : "bg-gray-600"
            }`}
            >
            <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition ${
                profile.notifyAboutGoal ? "right-1" : "left-1"
                }`}
            />
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-800">
          <p className="text-sm text-gray-300 mb-2">Напоминания в Telegram</p>
          {profile.telegramChatId ? (
            <div className="flex items-center justify-between">
              <span className="text-green-400 text-sm">✅ Telegram подключён</span>
              <button
                onClick={disconnectTelegram}
                className="text-sm text-gray-400 hover:text-red-400"
              >
                Отключить
              </button>
            </div>
          ) : telegramCode ? (
            <div className="text-sm space-y-2">
              <p className="text-gray-400">
                Открой бота и отправь ему <code className="bg-gray-800 px-1 rounded">/start {telegramCode}</code>,
                либо просто перейди по ссылке:
              </p>
              {botUsername && (
                <a
                  href={`https://t.me/${botUsername}?start=${telegramCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-3 py-1.5 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
                >
                  Открыть в Telegram
                </a>
              )}
            </div>
          ) : (
            <button
              onClick={connectTelegram}
              className="px-3 py-1.5 bg-blue-600 rounded-lg text-sm hover:bg-blue-500 transition"
            >
              Подключить Telegram
            </button>
          )}
        </div>

        <BadgeSection githubLogin={profile.githubLogin} />
      </div>
    </main>
  );
}