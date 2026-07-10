/**
 * Supabase PgBouncer иногда сбрасывает соединение (P1017, ConnectionReset,
 * "prepared statement does not exist"). Эта обёртка повторяет запрос
 * с экспоненциальным backoff.
 *
 * Если ошибки P1017 всё равно возникают - убедись что в DATABASE_URL есть
 * pgbouncer=true и connection_limit=1
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
  delayMs = 150
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const code = (err as { code?: string })?.code;
      const msg = (err as { message?: string })?.message ?? "";

      const isRetryable =
        code === "P1017" ||
        code === "P1001" ||
        code === "P2024" ||
        msg.includes("prepared statement") ||
        msg.includes("26000") ||
        msg.includes("Server has closed the connection") ||
        msg.includes("Connection reset") ||
        msg.includes("10054") ||
        msg.includes("ECONNRESET");

      if (!isRetryable || attempt === retries) throw err;

      // Экспоненциальный backoff: 150, 300, 600, 1200ms
      const delay = delayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[prismaRetry] attempt ${attempt}/${retries} failed (${code ?? "conn"}), retry in ${delay}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}