import { Response } from "express";
import crypto from "crypto";
import authService from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";

const isProd = process.env.NODE_ENV === "production";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
};

class AuthController {
  githubLogin(req: AuthRequest, res: Response) {
    const state = crypto.randomBytes(16).toString("hex");
    // В проде состояние стоит сверять через доп. cookie, для дипломного MVP — упрощаем
    const url = authService.getGithubAuthorizeUrl(state);
    return res.redirect(url);
  }

  async githubCallback(req: AuthRequest, res: Response) {
    const code = req.query.code as string | undefined;
    if (!code) {
      return res.redirect(`${FRONTEND_URL}/login?error=missing_code`);
    }

    try {
      const { token } = await authService.handleGithubCallback(code);
      res.cookie("token", token, COOKIE_OPTIONS);
      return res.redirect(`${FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error(error);
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }
  }

  async me(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const user = await authService.getMe(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  }

  logout(req: AuthRequest, res: Response) {
    res.clearCookie("token", COOKIE_OPTIONS);
    return res.json({ success: true });
  }
}

export default new AuthController();
