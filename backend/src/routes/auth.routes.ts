import { Router } from "express";
import authController from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/github", authController.githubLogin);
router.get("/github/callback", authController.githubCallback);

router.get("/me", authMiddleware, authController.me);
router.post("/logout", authController.logout);

export default router;
