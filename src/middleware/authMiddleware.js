import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const verifyToken = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer "))
      return res
        .status(401)
        .json({ success: false, message: "Token tidak ditemukan" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      "SELECT id, username, email, role, is_active FROM users WHERE id = $1",
      [decoded.id],
    );
    if (!rows.length)
      return res
        .status(401)
        .json({ success: false, message: "User tidak ditemukan" });
    if (!rows[0].is_active)
      return res
        .status(403)
        .json({ success: false, message: "Akun dinonaktifkan" });

    req.user = rows[0];
    next();
  } catch (err) {
    const msg =
      err.name === "TokenExpiredError"
        ? "Token kedaluwarsa"
        : "Token tidak valid";
    res.status(401).json({ success: false, message: msg });
  }
};

export const checkRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    next();
  };
