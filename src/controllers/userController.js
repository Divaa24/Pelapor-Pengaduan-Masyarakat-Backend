import bcrypt from "bcrypt";
import pool from "../config/db.js";

export const getAllUsers = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC",
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, email, role, is_active, created_at FROM users WHERE id = $1",
      [req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) 
      
      return res
        .status(400)
        .json({ success: false, message: "Field wajib tidak lengkap" });

    const exists = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username],
    );
    if (exists.rows.length)
      return res
        .status(409)
        .json({ success: false, message: "Email atau username sudah ada" });

    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, created_at`,
      [username, email, hashed, role || "user"],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { username, email, role, is_active, password } = req.body;

    let passwordHash = undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const { rows } = await pool.query(
      `UPDATE users SET
         username  = COALESCE($1, username),
         email     = COALESCE($2, email),
         role      = COALESCE($3, role),
         is_active = COALESCE($4, is_active),
         password  = COALESCE($5, password)
       WHERE id = $6
       RETURNING id, username, email, role, is_active`,
      [username, email, role, is_active, passwordHash ?? null, req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    res.json({ success: true, message: "User berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
