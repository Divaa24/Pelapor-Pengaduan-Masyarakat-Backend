import pool from "../config/db.js";

export const getMyNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, r.header AS report_header
       FROM notifications n
       LEFT JOIN public_reports r ON n.report_id = r.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [req.user.id],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markRead = async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    res.json({ success: true, message: "Notifikasi ditandai sudah dibaca" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1",
      [req.user.id],
    );
    res.json({
      success: true,
      message: "Semua notifikasi ditandai sudah dibaca",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    res.json({ success: true, message: "Notifikasi dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteAllNotifications = async (req, res) => {
  try {
    await pool.query("DELETE FROM notifications WHERE user_id = $1", [
      req.user.id,
    ]);
    res.json({ success: true, message: "Semua notifikasi dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
