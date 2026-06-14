import { Router } from "express";
import {
  getAll,
  getMyReports,
  getById,
  create,
  update,
  updateStatus,
  remove,
  toggleVote,
  getMapData,
  getStatusHistory,
} from "../controllers/reportController.js";
import {
  getByReport,
  create as createComment,
} from "../controllers/commentController.js";
import { verifyToken, checkRole } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

const router = Router();

router.get("/map", getMapData);
router.get("/", getAll);
router.get("/my", verifyToken, getMyReports);
router.get("/:id", getById);
router.get("/:id/status-history", verifyToken, getStatusHistory);
router.get("/:reportId/comments", getByReport);

router.post("/", verifyToken, upload.single("image"), create);
router.put("/:id", verifyToken, upload.single("image"), update);
router.patch(
  "/:id/status",
  verifyToken,
  checkRole("admin", "super_admin"),
  updateStatus,
);
router.delete("/:id", verifyToken, remove);
router.post("/:id/vote", verifyToken, toggleVote);
router.post("/:reportId/comments", verifyToken, createComment);

export default router;
