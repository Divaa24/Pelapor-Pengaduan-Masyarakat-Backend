import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  updateAvatar,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";


const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);
router.post("/avatar", verifyToken, upload.single("avatar"), updateAvatar);

export default router;
