"use client";
import { githubLoginUrl } from "@/lib/api";

const SOCIAL_LINKS = [
  {
    href: "https://github.com/BitBoxxxer/AI_-_Esoft",
    label: "GitHub репозиторий",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 .5C5.73.5.98 5.24.98 11.52c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.1-3.17.69-3.84-1.35-3.84-1.35-.52-1.31-1.26-1.66-1.26-1.66-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.51-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 5.72 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.75.11 3.04.73.8 1.17 1.82 1.17 3.06 0 4.37-2.67 5.34-5.21 5.62.41.36.77 1.06.77 2.15 0 1.55-.01 2.8-.01 3.18 0 .3.2.66.79.55A11.03 11.03 0 0 0 23.02 11.5C23.02 5.24 18.27.5 12 .5Z" />
      </svg>
    ),
  },
  {
    href: "https://t.me/ImKaseyFuck",
    label: "Telegram",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M22.05 3.28 2.9 10.86c-1.3.53-1.3 1.27-.24 1.6l4.9 1.53 1.9 5.8c.23.63.4.88.82.88.4 0 .58-.18.8-.4l1.94-1.9 4.05 3c.75.42 1.28.2 1.47-.7l2.66-12.6c.28-1.15-.42-1.66-1.15-1.4Zm-12.2 10.4-1.14 3.86-.9-3.34 8.9-5.65c.34-.2.66.09.35.38l-7.2 4.75Z" />
      </svg>
    ),
  },
  {
    href: "https://bitboxxxer.github.io",
    label: "Мой сайт",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M2.5 12h19M12 2.5c2.5 2.7 3.9 6 3.9 9.5s-1.4 6.8-3.9 9.5c-2.5-2.7-3.9-6-3.9-9.5S9.5 5.2 12 2.5Z" />
      </svg>
    ),
  },
];

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden px-4">
      {/* мягкое свечение на фоне для акцента */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-blue-600/20 blur-[120px]" />

      <div className="relative w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur p-8 text-center shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-1">🐇 Habit GRabbit</h1>
        <p className="text-gray-400 text-sm mb-8">
          Привычка быстрого Git - бери эту привычку
        </p>

        <a
          href={githubLoginUrl()}
          className="flex items-center justify-center gap-2 bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-gray-200 transition"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 .5C5.73.5.98 5.24.98 11.52c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.1-3.17.69-3.84-1.35-3.84-1.35-.52-1.31-1.26-1.66-1.26-1.66-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.51-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 5.72 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.75.11 3.04.73.8 1.17 1.82 1.17 3.06 0 4.37-2.67 5.34-5.21 5.62.41.36.77 1.06.77 2.15 0 1.55-.01 2.8-.01 3.18 0 .3.2.66.79.55A11.03 11.03 0 0 0 23.02 11.5C23.02 5.24 18.27.5 12 .5Z" />
          </svg>
          Войти через GitHub
        </a>

        <p className="text-gray-500 text-xs mt-6">
          Мы попросим доступ на чтение профиля и активности - без него
          статистику и стрики показать не получится.
        </p>

        <div className="mt-8 pt-6 border-t border-neutral-800 flex items-center justify-center gap-5">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
              className="text-gray-500 hover:text-blue-400 transition"
            >
              {link.icon}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
