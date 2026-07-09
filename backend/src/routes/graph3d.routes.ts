import { Router } from "express";
import graph3DController from "../controllers/graph3d.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// GET /api/graph3d?refresh=true  — refresh=true форсирует пересборку графика,
// без него отдаётся закэшированная версия (до 30 минут)
router.get("/", authMiddleware, (req, res) => graph3DController.getSvg(req, res));

export default router;
