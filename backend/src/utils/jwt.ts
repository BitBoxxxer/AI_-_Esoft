import jwt from "jsonwebtoken";

export interface JwtPayload {
  id: string;
  email: string | null;
  name?: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = "30d";

if (!JWT_SECRET) {
  // Не бросаем сразу на импорте в тестах, но громко предупреждаем
  console.warn("[jwt] JWT_SECRET не задан в .env - токены будут небезопасны!");
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
