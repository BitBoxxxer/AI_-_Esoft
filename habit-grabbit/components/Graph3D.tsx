"use client";
import { useRef, useState } from "react";
import { API_URL } from "@/lib/api";

// Из-за ограничений мощностей бесплатного деплоя бэкенда (Render) генерация
// 3D-графика иногда падает с 500 / ERR_BLOCKED_BY_RESPONSE при холодном старте.
// В этом случае просто тихо пробуем ещё раз, не дёргая пользователя.
const MAX_AUTO_RETRIES = 3;

// Заменяет самодельную теплокарту на 3D-изображение активности,
// которое генерирует бэкенд через yoshi389111/github-profile-3d-contrib.
export default function Graph3D() {
  // loading=true с самого начала: график должен начинать грузиться
  // автоматически сразу при входе в dashboard, без клика на "Обновить".
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Меняем ключ у <img>, чтобы браузер точно перезапросил картинку
  const [version, setVersion] = useState(0);
  const retriesRef = useRef(0);

  const refresh = () => {
    retriesRef.current = 0;
    setFailed(false);
    setLoading(true);
    setVersion((v) => v + 1);
  };

  const handleError = () => {
    if (retriesRef.current < MAX_AUTO_RETRIES) {
      retriesRef.current += 1;
      // Просто перезапрашиваем ещё раз с ?refresh=true
      setVersion((v) => v + 1);
    } else {
      retriesRef.current = 0;
      setLoading(false);
      setFailed(true);
    }
  };

  const handleLoad = () => {
    retriesRef.current = 0;
    setLoading(false);
    setFailed(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Активность</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition disabled:opacity-50"
        >
          {loading ? "Обновляю..." : "Обновить"}
        </button>
      </div>
      <div className="relative rounded-xl overflow-hidden bg-black/20 min-h-[160px]">
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <span className="text-white">Генерирую график...</span>
          </div>
        )}
        {failed && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-gray-400 text-sm">
              Не удалось загрузить график. Попробуй нажать "Обновить".
            </span>
          </div>
        )}
        <img
          key={version}
          // На первой попытке (version === 0) refresh не форсируем, дальше —
          // всегда с ?refresh=true, чтобы бэкенд точно перегенерировал картинку.
          src={`${API_URL}/api/graph3d${version > 0 ? "?refresh=true" : ""}`}
          alt="3D график активности"
          className="w-full h-auto max-h-[800px] object-contain mx-auto"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    </div>
  );
}
