import multer from "multer";
import path from "path";

// Use memory storage so uploads work on serverless (read-only) environments.
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ok =
    allowed.test(path.extname(file.originalname).toLowerCase()) &&
    allowed.test(file.mimetype);
  ok ? cb(null, true) : cb(new Error("Hanya jpg, jpeg, png, webp"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
