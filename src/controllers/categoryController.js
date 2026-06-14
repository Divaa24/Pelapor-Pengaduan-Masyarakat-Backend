import pool from "../config/db.js";

export const getAll = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM categories ORDER BY category_name",
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { category_name, description, icon } = req.body;
    if (!category_name)
      return res
        .status(400)
        .json({ success: false, message: "Nama kategori wajib diisi" });

    const { rows } = await pool.query(
      "INSERT INTO categories (category_name, description, icon) VALUES ($1, $2, $3) RETURNING *",
      [category_name, description, icon],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { category_name, description, icon } = req.body;
    const { rows } = await pool.query(
      `UPDATE categories SET
         category_name = COALESCE($1, category_name),
         description   = COALESCE($2, description),
         icon          = COALESCE($3, icon)
       WHERE id = $4 RETURNING *`,
      [category_name, description, icon, req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM categories WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    res.json({ success: true, message: "Kategori berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
