import { Router } from "express";
import badgeController from "../controllers/badge.controller";

const router = Router();

// GET /api/badge/:login.svg - без авторизации, публичный доступ
router.get("/:login", (req, res) => badgeController.getSvg(req, res));

export default router;
