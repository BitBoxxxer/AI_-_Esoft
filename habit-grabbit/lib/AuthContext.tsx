"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiFetch } from "@/lib/api";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  githubLogin: string | null;
  dailyGoal: number;
  notifyAboutGoal: boolean;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: "loading",
  refresh: async () => {},
});

async function fetchMe(retries = 5): Promise<AuthUser | null> {
  for (let i = 0; i < retries; i++) {
    const res = await apiFetch("/auth/me");

    if (res.ok) return res.json();
    if (res.status === 401 || res.status === 404) return null;

    // 503 = база временно недоступна, повторяем через 1 секунду
    if (res.status === 503 && i < retries - 1) {
      console.warn(`[AuthContext] /auth/me returned 503, retry ${i + 1}/${retries}`);
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    return null;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const userData = await fetchMe();
      if (userData) {
        setUser(userData);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, status, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
