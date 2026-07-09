/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import BackToDashboardButton from "@/components/BackToDashboardButton";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  dailyGoal: number;
  notifyAboutGoal: boolean;
}

export default function ProfilePage() {
  const status = useRequireAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  
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

  if (status === "loading" || !profile)
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Загрузка...</div>;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">👤 Профиль</h1>
        <BackToDashboardButton />
      </div>

      <div className="bg-gray-900 rounded-xl p-6 max-w-md">
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
            <p className="text-2xl font-bold">{profile.dailyGoal || "—"}</p>
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
      </div>
    </main>
  );
}