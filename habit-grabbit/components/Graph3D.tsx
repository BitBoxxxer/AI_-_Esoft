"use client";
import { useState } from "react";
import { API_URL } from "@/lib/api";

// Заменяет самодельную теплокарту на 3D-изображение активности,
// которое генерирует бэкенд через yoshi389111/github-profile-3d-contrib.
export default function Graph3D() {
  const [loading, setLoading] = useState(false);
  // Меняем ключ у <img>, чтобы браузер точно перезапросил картинку после рефреша
  const [version, setVersion] = useState(0);

  const refresh = async () => {
    setLoading(true);
    setVersion((v) => v + 1);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Активность</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
        >
          Обновить
        </button>
      </div>
      <div className="relative rounded-xl overflow-hidden bg-black/20">
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <span className="text-white">Генерирую график...</span>
          </div>
        )}
        <img
          key={version}
          src={`${API_URL}/api/graph3d${version > 0 ? "?refresh=true" : ""}`}
          alt="3D график активности"
          className="w-full h-auto"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
