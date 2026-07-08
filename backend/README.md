# Habit GRabbit — Backend (Express + Prisma + PostgreSQL)

Полностью переписанный backend на Node.js/Express, который заменяет API-роуты
из `habit-grabbit` (Next.js). Авторизация — через GitHub OAuth, сессия — JWT
в httpOnly cookie (без NextAuth).

## 1. Настройка GitHub OAuth App

1. Зайти на https://github.com/settings/developers → New OAuth App.
2. Homepage URL: `http://localhost:3000` (или адрес фронтенда в проде).
3. Authorization callback URL: `http://localhost:4000/auth/github/callback`
   (в проде — адрес вашего бэкенда + `/auth/github/callback`).
4. Скопировать `Client ID` и `Client Secret` в `.env`.

## 2. Переменные окружения (`.env`)

Уже создан шаблон `.env` в этой папке — заполните:

- `DATABASE_URL` — строка подключения к вашей PostgreSQL (Neon/Vercel Postgres/Supabase/локальная).
- `JWT_SECRET` — случайная длинная строка (`openssl rand -base64 32`).
- `GITHUB_ID`, `GITHUB_SECRET`, `GITHUB_CALLBACK_URL` — из шага 1.
- `FRONTEND_URL` — адрес Next.js фронтенда (для CORS и редиректа после логина).
- `PORT` — порт Express (по умолчанию 4000).
- `AI_BASE_URL`, `AI_MODEL` — для локального Ollama по умолчанию
  `http://127.0.0.1:11434/v1/chat/completions`. **На Vercel/serverless это работать не будет** —
  либо деплойте backend на VPS/Render/Railway рядом с Ollama, либо смените
  `AI_BASE_URL`/добавьте ключ на облачный OpenAI-совместимый эндпоинт.

## 3. Установка и миграции

```bash
npm install
npx prisma migrate dev --name init   # создаст таблицы в вашей Postgres БД
npm run dev                          # старт на http://localhost:4000
```

> Важно: старые миграции в `prisma/migrations` были сгенерированы под SQLite
> и удалены — `migrate dev` создаст новые, уже под PostgreSQL, с нуля.

## 4. Структура API

Все `/api/*` роуты (кроме `/auth/github*`) требуют cookie `token`
(httpOnly, выставляется backend'ом после логина).

| Метод | Путь | Описание |
|---|---|---|
| GET | `/auth/github` | Редирект на GitHub OAuth |
| GET | `/auth/github/callback` | Callback, ставит cookie, редиректит на `FRONTEND_URL/dashboard` |
| GET | `/auth/me` | Текущий пользователь (замена `useSession`) |
| POST | `/auth/logout` | Разлогин (чистит cookie) |
| GET/POST | `/api/goals` | Список / создание целей |
| PATCH/DELETE | `/api/goals/:id` | Обновление / удаление цели |
| GET/POST | `/api/columns` | Список / создание колонок |
| PATCH/DELETE | `/api/columns/:id` | Обновление / удаление колонки |
| GET/POST | `/api/conversations` | Список / создание диалогов с AI |
| GET | `/api/conversations/:id/messages` | Сообщения диалога |
| PATCH | `/api/messages/:id` | Редактирование сообщения (с каскадным удалением последующих) |
| POST | `/api/chat` | Отправка сообщения AI-ассистенту (`{ message, conversationId, memory? }`) |
| GET/PATCH | `/api/notifications` | Список / пометка всех как прочитанных |
| GET | `/api/stats` | Дневная статистика (`?days=365`) |
| POST | `/api/stats/refresh` | Подтянуть контрибуции из GitHub GraphQL |
| GET/PATCH | `/api/user/profile` | Профиль пользователя |
| PATCH | `/api/user/goal` | Дневная цель (`dailyGoal`) |

## 5. Что важно поменять на фронтенде (Next.js)

Т.к. теперь авторизация не через NextAuth, а через собственный Express + JWT-cookie:

1. Кнопка входа (`/login`) должна вести на `${NEXT_PUBLIC_API_URL}/auth/github`
   (обычный `<a href>`, не `signIn()` из next-auth).
2. Все `fetch("/api/...")` в компонентах (`goals/page.tsx`, `profile/page.tsx`,
   `chat/page.tsx`, `RefreshStatsButton`, `ActivityView`, `NotificationBell`,
   `GoalSetter`) — заменить на `fetch(\`${NEXT_PUBLIC_API_URL}/api/...\`, { credentials: "include" })`,
   т.к. cookie теперь ставит отдельный домен/порт (кросс-доменные запросы требуют
   `credentials: "include"` на фронте и `sameSite: "none"; secure: true` в проде на бэкенде — это уже учтено в `auth.controller.ts`).
3. `useSession()` из next-auth — заменить на простой хук/контекст, который делает
   `fetch(\`${NEXT_PUBLIC_API_URL}/auth/me\`, { credentials: "include" })` и хранит
   пользователя в состоянии.
4. `middleware.ts` (защита роутов через NextAuth) — переписать на проверку через
   клиентский редирект (если `/auth/me` вернул 401 → редирект на `/login`),
   либо читать cookie `token` в middleware и валидировать её (но `jsonwebtoken`
   в Edge Runtime Next.js middleware не работает "из коробки" — потребуется
   `jose` или проверка на уровне страницы/layout).
5. Можно оставить старые `app/api/*` в Next.js удалёнными или отключенными —
   они больше не нужны.
6. Удалить зависимости `next-auth`, `@next-auth/prisma-adapter` из
   `habit-grabbit/package.json`, если они больше нигде не используются.

Старые файлы `lib/authOptions.ts`, `lib/ai.ts`, `lib/github.ts`, `lib/prisma.ts`
из `habit-grabbit` больше не нужны — их логика перенесена в
`backend/src/{services,utils}`.
