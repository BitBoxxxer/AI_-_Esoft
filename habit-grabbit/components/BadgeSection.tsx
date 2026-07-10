"use client";
import { useState } from "react";
import { API_URL } from "@/lib/api";

interface BadgeSectionProps {
  githubLogin: string | null;
}

export default function BadgeSection({ githubLogin }: BadgeSectionProps) {
  const [copied, setCopied] = useState(false);

  if (!githubLogin) {
    return (
      <div className="mt-6 pt-6 border-t border-gray-800">
        <p className="text-sm text-gray-300 mb-2">🏅 Бейдж для GitHub-профиля</p>
        <p className="text-sm text-gray-500">
          Не удалось определить твой GitHub-логин - переподключи GitHub в профиле.
        </p>
      </div>
    );
  }

  const badgeUrl = `${API_URL}/api/badge/${githubLogin}.svg`;
  const markdown = `![Habit Grabbit Streak](${badgeUrl})`;

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-800">
      <p className="text-sm text-gray-300 mb-1">Бейдж со стриком для GitHub-профиля</p>
      <p className="text-xs text-gray-500 mb-4">
        Живая картинка с твоим текущим стриком - обновляется сама, вставь один раз и забудь.
      </p>

      {/* Живой превью бейджа - именно то, что увидят гости твоего профиля */}
      <div className="mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeUrl}
          alt="Habit Grabbit Streak"
          className="rounded-lg border border-gray-800 max-w-full h-auto"
          width={380}
          height={90}
        />
      </div>

      <ol className="text-sm text-gray-400 space-y-2 mb-4 list-decimal list-inside">
        <li>
          Зайди на{" "}
          <a
            href="https://github.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            github.com/new
          </a>{" "}
          и создай репозиторий с именем{" "}
          <b className="text-white">точно как твой username</b> -{" "}
          <code className="bg-gray-800 px-1 rounded">{githubLogin}/{githubLogin}</code>.
          GitHub сам покажет README из него на странице твоего профиля.
        </li>
        <li>
          При создании включи галочку{" "}
          <span className="text-gray-300">&quot;Add a README file&quot;</span>{" "}
          (если репозиторий уже есть - просто открой{" "}
          <code className="bg-gray-800 px-1 rounded">README.md</code> в нём).
        </li>
        <li>Вставь строку ниже в README.md и сохрани (Commit changes).</li>
      </ol>

      <div className="relative">
        <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto pr-16">
          {markdown}
        </pre>
        <button
          onClick={copy}
          className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition text-gray-200"
        >
          {copied ? "Скопировано!" : "Копировать"}
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-3">
        Готово - после коммита открой свой профиль на GitHub, бейдж уже там.
      </p>
    </div>
  );
}
