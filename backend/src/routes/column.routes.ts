import { Router } from "express";
import columnController from "../controllers/column.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", columnController.getColumns);
router.post("/", columnController.createColumn);
router.patch("/:id", columnController.updateColumn);
router.delete("/:id", columnController.deleteColumn);

export default router;
