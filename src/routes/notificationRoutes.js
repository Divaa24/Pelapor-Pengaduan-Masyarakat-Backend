import { Router } from "express";
import {
  getMyNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = Router();

router.use(verifyToken);

router.get("/", getMyNotifications);
router.patch("/:id/read", markRead);
router.patch("/read-all", markAllRead);
router.delete("/:id", deleteNotification);
router.delete("/", deleteAllNotifications);

export default router;
