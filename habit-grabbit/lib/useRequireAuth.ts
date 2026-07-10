"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

// Раньше защита страниц /dashboard, /goals, /chat, /profile была через
// next-auth middleware.ts (проверка на Edge). Теперь авторизация - свой JWT
// в httpOnly cookie, а Edge Runtime Next.js не может просто так проверить
// подпись без доп. библиотек (jose) - поэтому защиту делаем на клиенте:
// если /auth/me вернул 401, редиректим на /login.
export function useRequireAuth() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  return status;
}
