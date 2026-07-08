import { Request, Response, NextFunction } from "express";
import { verifyJwt, JwtPayload } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    req.user = verifyJwt(token);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
