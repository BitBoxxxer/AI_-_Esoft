import { Router } from "express";
import watchedController from "../controllers/watched.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, (req, res) => watchedController.list(req, res));
router.post("/", authMiddleware, (req, res) => watchedController.add(req, res));
router.delete("/:id", authMiddleware, (req, res) => watchedController.remove(req, res));
router.get("/suggestions", authMiddleware, (req, res) => watchedController.suggestions(req, res));
router.get("/activity", authMiddleware, (req, res) => watchedController.activity(req, res));

export default router;
