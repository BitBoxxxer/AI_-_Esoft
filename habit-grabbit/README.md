# Habit GRabbit — Frontend (Next.js)

Это чисто UI-часть проекта. Вся авторизация и данные теперь приходят с
отдельного Express-бэкенда (папка `../backend`).

## Настройка

1. Убедитесь, что backend запущен (см. `backend/README.md`), обычно на
   `http://localhost:4000`.
2. В `.env.local` укажите адрес бэкенда:

   ```
   NEXT_PUBLIC_API_URL="http://localhost:4000"
   ```

3. Установка и запуск:

   ```bash
   npm install
   npm run dev
   ```

   Приложение будет на `http://localhost:3000`.

## Как теперь устроена авторизация

- next-auth больше не используется.
- Кнопка "Войти через GitHub" (`/login`) ведёт на
  `${NEXT_PUBLIC_API_URL}/auth/github` — это редирект на GitHub OAuth,
  который делает backend.
- После логина backend ставит httpOnly cookie `token` и редиректит обратно
  на `${FRONTEND_URL}/dashboard` (см. `backend/.env`).
- `lib/AuthContext.tsx` — замена `SessionProvider`/`useSession`: при монтировании
  дергает `GET /auth/me` на бэкенде и хранит пользователя в React-контексте.
- `lib/useRequireAuth.ts` — замена `middleware.ts`: если `/auth/me` вернул 401,
  редиректит на `/login`. Используется в защищённых страницах
  (`dashboard`, `goals`, `chat`, `profile`).
- `lib/api.ts` — обёртка над `fetch` с `credentials: "include"`, чтобы cookie
  всегда уходила на бэкенд (в том числе на другой домен/порт).

## Продакшн / деплой

Т.к. фронтенд и бэкенд теперь отдельные сервисы:

- Frontend можно деплоить на Vercel как обычно.
- Backend **нельзя** деплоить на Vercel как serverless-функцию, если чат
  использует локальный Ollama — деплойте его на VPS/Render/Railway (см.
  `backend/README.md`).
- В проде backend должен ставить cookie с `sameSite: "none"; secure: true`
  (уже реализовано в `auth.controller.ts`), а `FRONTEND_URL`/`NEXT_PUBLIC_API_URL`
  должны указывать на реальные HTTPS-адреса.
