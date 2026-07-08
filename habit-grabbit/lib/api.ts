// Единая точка обращения к Express-бэкенду.
// Все запросы идут с credentials: "include", чтобы браузер отправлял
// httpOnly cookie "token", которую ставит backend после GitHub OAuth.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

export function githubLoginUrl() {
  return `${API_URL}/auth/github`;
}
