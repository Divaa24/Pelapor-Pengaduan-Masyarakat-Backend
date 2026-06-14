import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Semua field wajib diisi" });

    const exists = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username],
    );
    if (exists.rows.length)
      return res.status(409).json({
        success: false,
        message: "Email atau username sudah digunakan",
      });

    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, role, created_at`,
      [username, email, hashed],
    );

    res
      .status(201)
      .json({ success: true, message: "Registrasi berhasil", data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email dan password wajib diisi" });

    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (!rows.length)
      return res
        .status(401)
        .json({ success: false, message: "Email atau password salah" });

    const user = rows[0];
    if (!user.is_active)
      return res
        .status(403)
        .json({ success: false, message: "Akun dinonaktifkan" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res
        .status(401)
        .json({ success: false, message: "Email atau password salah" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    const { password: _, ...userData } = user;
    res.json({
      success: true,
      message: "Login berhasil",
      token,
      data: userData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, email, role, avatar, created_at FROM users WHERE id = $1",
      [req.user.id],
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username)
      return res
        .status(400)
        .json({ success: false, message: "Username wajib diisi" });

    const exists = await pool.query(
      "SELECT id FROM users WHERE username = $1 AND id != $2",
      [username, req.user.id],
    );
    if (exists.rows.length)
      return res
        .status(409)
        .json({ success: false, message: "Username sudah digunakan" });

    const { rows } = await pool.query(
      `UPDATE users SET username = $1
       WHERE id = $2
       RETURNING id, username, email, role, avatar, created_at`,
      [username, req.user.id],
    );
    res.json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "File tidak ditemukan" });

    const { rows } = await pool.query(
      `UPDATE users SET avatar = $1
       WHERE id = $2
       RETURNING id, username, email, role, avatar, created_at`,
      [req.file.filename, req.user.id],
    );
    res.json({
      success: true,
      message: "Avatar berhasil diperbarui",
      data: rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
