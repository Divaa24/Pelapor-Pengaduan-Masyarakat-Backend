import { Router } from "express";
import {
  getAll,
  create,
  update,
  remove,
} from "../controllers/categoryController.js";
import { verifyToken, checkRole } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", getAll);
router.post("/", verifyToken, checkRole("admin", "super_admin"), create);
router.put("/:id", verifyToken, checkRole("admin", "super_admin"), update);
router.delete("/:id", verifyToken, checkRole("super_admin"), remove);

export default router;
