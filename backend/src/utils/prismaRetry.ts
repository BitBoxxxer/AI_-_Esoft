// PgBouncer иногда сбрасывает соединение (P1017, code 10054). ЭТО БЫЛО УЖАНО КЛЯНУСЬ +2 Эта обёртка повторяет запрос до 3 раз с небольшой паузой.
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
  delayMs = 100
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const code = (err as { code?: string })?.code;
      const msg = (err as { message?: string })?.message ?? "";

      const isConnectionError =
        code === "P1017" ||
        code === "P1001" ||
        msg.includes("Server has closed the connection") ||
        msg.includes("Connection reset") ||
        msg.includes("10054");

      if (!isConnectionError || attempt === retries) throw err;

      const delay = delayMs * attempt; // 100, 200, 300, 400ms
      console.warn(`[prismaRetry] attempt ${attempt}/${retries} failed (${code ?? "conn"}), retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}