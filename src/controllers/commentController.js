import pool from "../config/db.js";

export const getByReport = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cm.*, u.username, u.avatar
       FROM comments cm
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.public_report_id = $1
       ORDER BY cm.created_at ASC`,
      [req.params.reportId],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body)
      return res
        .status(400)
        .json({ success: false, message: "Komentar tidak boleh kosong" });

    const { rows } = await pool.query(
      `INSERT INTO comments (body, user_id, public_report_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [body, req.user.id, req.params.reportId],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const existing = await pool.query("SELECT * FROM comments WHERE id = $1", [
      req.params.id,
    ]);
    if (!existing.rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Komentar tidak ditemukan" });

    const comment = existing.rows[0];
    if (comment.user_id !== req.user.id && req.user.role === "user")
      return res
        .status(403)
        .json({ success: false, message: "Tidak diizinkan" });

    await pool.query("DELETE FROM comments WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: "Komentar berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
