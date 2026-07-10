import { Router } from "express";
import telegramController from "../controllers/telegram.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/link-code", authMiddleware, (req, res) => telegramController.linkCode(req, res));
router.post("/unlink", authMiddleware, (req, res) => telegramController.unlink(req, res));

// Публичные — без authMiddleware, защищены секретом в query
router.post("/webhook", (req, res) => telegramController.webhook(req, res));
router.post("/run-reminders", (req, res) => telegramController.runReminders(req, res));
router.get("/run-reminders", (req, res) => telegramController.runReminders(req, res));

export default router;
