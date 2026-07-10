# Habit GRabbit - Backend (Express + Prisma + PostgreSQL)

Backend на Node.js/Express с авторизацией через GitHub OAuth и собственной
JWT-сессией в httpOnly cookie (без NextAuth).

## 1. Настройка GitHub OAuth App

1. https://github.com/settings/developers → New OAuth App.
2. Homepage URL: адрес фронтенда (`http://localhost:3000` для разработки).
3. Authorization callback URL: `<адрес бэкенда>/auth/github/callback`.
4. Скопировать `Client ID` и `Client Secret` в `.env`.

## 2. Переменные окружения (`.env`)

- `DATABASE_URL` - строка подключения к PostgreSQL (Supabase/Neon/локальная).
- `JWT_SECRET` - случайная длинная строка (`openssl rand -base64 32`).
- `GITHUB_ID`, `GITHUB_SECRET`, `GITHUB_CALLBACK_URL` - из шага 1.
- `FRONTEND_URL` - адрес фронтенда (для CORS и редиректа после логина).
- `PORT` - порт Express (по умолчанию 4000).
- `AI_BASE_URL`, `AI_MODEL` - эндпоинт AI-модели (по умолчанию локальный Ollama:
  `http://127.0.0.1:11434/v1/chat/completions`). Для облачного деплоя без
  своего GPU - указывает на OpenAI-совместимый облачный эндпоинт.
- `TELEGRAM_BOT_TOKEN` - токен Telegram-бота от @BotFather (для уведомлений).
- `TELEGRAM_WEBHOOK_SECRET` - секрет, которым защищены публичные
  `/api/telegram/webhook` и `/api/telegram/run-reminders`.

## 3. Установка и миграции

```bash
npm install
npx prisma db push   # синхронизирует схему с БД (Supabase pooler не поддерживает `migrate dev`)
npm run dev           # старт на http://localhost:4000
```

> Проект использует Supabase PostgreSQL через PgBouncer (pooler). Из-за
> ограничений pooler'а на prepared statements и транзакции все обращения к
> Prisma в `services/*` обёрнуты в `utils/prismaRetry.ts` - при сбросе
> соединения запрос автоматически повторяется.

## 4. API

Все `/api/*` роуты (кроме публичных, отмеченных ниже) требуют cookie `token`.

### Авторизация

| Метод | Путь | Описание |
|---|---|---|
| GET | `/auth/github` | Редирект на GitHub OAuth |
| GET | `/auth/github/callback` | Callback, ставит cookie, редиректит на `FRONTEND_URL/dashboard` |
| GET | `/auth/me` | Текущий пользователь |
| POST | `/auth/logout` | Разлогин (чистит cookie) |

### Цели и колонки

| Метод | Путь | Описание |
|---|---|---|
| GET/POST | `/api/goals` | Список / создание целей |
| PATCH/DELETE | `/api/goals/:id` | Обновление / удаление цели |
| GET/POST | `/api/columns` | Список / создание колонок |
| PATCH/DELETE | `/api/columns/:id` | Обновление / удаление колонки |

### AI-чат

| Метод | Путь | Описание |
|---|---|---|
| GET/POST | `/api/conversations` | Список / создание диалогов с AI |
| GET | `/api/conversations/:id/messages` | Сообщения диалога |
| PATCH | `/api/messages/:id` | Редактирование сообщения (каскадно удаляет последующие) |
| POST | `/api/chat` | Отправка сообщения AI-ассистенту (`{ message, conversationId, memory? }`) |

### Статистика и дашборд

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/stats` | Дневная статистика (`?days=365`) |
| GET | `/api/stats/dashboard` | Агрегированные данные для главного экрана |
| POST | `/api/stats/refresh` | Подтянуть контрибуции из GitHub GraphQL |
| GET | `/api/graph3d` | SVG 3D-графика контрибуций (`?refresh=true` - форс-пересборка, иначе кэш до 30 мин) |

### Профиль и уведомления

| Метод | Путь | Описание |
|---|---|---|
| GET/PATCH | `/api/user/profile` | Профиль пользователя |
| PATCH | `/api/user/goal` | Дневная цель (`dailyGoal`) |
| GET/PATCH | `/api/notifications` | Список / пометка всех как прочитанных |

### Друзья / подписки

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/watched` | Список отслеживаемых пользователей + их streak |
| POST | `/api/watched` | Подписаться на GitHub-логин |
| DELETE | `/api/watched/:id` | Отписаться |
| GET | `/api/watched/suggestions` | Предложения (например, по контактам GitHub) |
| GET | `/api/watched/activity` | Лента активности отслеживаемых |

### Публичные (без авторизации)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/badge/:login.svg` | Бейдж со streak для вставки в чужой README |
| POST | `/api/telegram/webhook` | Webhook для Telegram-бота |
| GET/POST | `/api/telegram/run-reminders` | Триггер рассылки напоминаний (по секрету в query) |

### Telegram (с авторизацией)

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/telegram/link-code` | Сгенерировать код для привязки Telegram-аккаунта |
| POST | `/api/telegram/unlink` | Отвязать Telegram |

## 5. Структура

```
src/
  app.ts            - сборка Express-приложения, CORS, роуты
  server.ts         - точка входа (слушает PORT)
  config/prisma.ts  - синглтон PrismaClient
  middlewares/       - authMiddleware (проверка JWT из cookie)
  routes/            - по одному файлу на сущность
  controllers/        - обработка HTTP, вызывают services
  services/            - бизнес-логика и обращения к БД
  utils/
    jwt.ts            - подпись/проверка JWT
    github.ts          - обёртки над GitHub REST/GraphQL API
    ai.ts               - обёртка над Ollama/OpenAI-совместимым API
    prismaRetry.ts       - retry-обёртка для нестабильных соединений через PgBouncer
```
