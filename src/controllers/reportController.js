import pool from "../config/db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cloudinary from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAll = async (req, res) => {
  try {
    const {
      status,
      category_id,
      search,
      page = 1,
      limit = 10,
      mine,
    } = req.query;
    const conditions = [];
    const values = [];
    let i = 1;

    // Kalau bukan dari user sendiri, hanya tampilkan yang public
    if (!mine) {
      conditions.push(`r.is_public = true`);
    }

    if (status) {
      conditions.push(`r.status = $${i++}`);
      values.push(status);
    }
    if (category_id) {
      conditions.push(`r.category_id = $${i++}`);
      values.push(category_id);
    }
    if (search) {
      conditions.push(`r.header ILIKE $${i++}`);
      values.push(`%${search}%`);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT r.*, u.username, u.avatar, c.category_name,
              COUNT(cm.id)::int AS comment_count
       FROM public_reports r
       LEFT JOIN users      u  ON r.user_id     = u.id
       LEFT JOIN categories c  ON r.category_id = c.id
       LEFT JOIN comments   cm ON cm.public_report_id = r.id
       ${where}
       GROUP BY r.id, u.username, u.avatar, c.category_name
       ORDER BY r.is_urgent DESC, r.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset],
    );

    const count = await pool.query(
      `SELECT COUNT(*) FROM public_reports r ${where}`,
      values,
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(count.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count.rows[0].count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, c.category_name, COUNT(cm.id)::int AS comment_count
       FROM public_reports r
       LEFT JOIN categories c  ON r.category_id = c.id
       LEFT JOIN comments   cm ON cm.public_report_id = r.id
       WHERE r.user_id = $1
       GROUP BY r.id, c.category_name
       ORDER BY r.created_at DESC`,
      [req.user.id],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.username, u.avatar, c.category_name
       FROM public_reports r
       LEFT JOIN users      u ON r.user_id     = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.id = $1`,
      [req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Laporan tidak ditemukan" });

    const images = await pool.query(
      "SELECT * FROM report_images WHERE report_id = $1",
      [req.params.id],
    );
    rows[0].images = images.rows;

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    console.log(
      "Create report request - hasFile:",
      !!req.file,
      "content-type:",
      req.headers["content-type"],
    );
    const {
      header,
      body,
      category_id,
      latitude,
      longitude,
      address,
      is_public,
      is_urgent,
    } = req.body;
    if (!header || !body)
      return res
        .status(400)
        .json({ success: false, message: "Header dan body wajib diisi" });

    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (lat < -6.47 || lat > -6.32 || lng < 106.72 || lng > 106.88)
        return res.status(400).json({
          success: false,
          message: "Koordinat di luar wilayah Kota Depok",
        });
    }

    let imagePath = null;
    if (req.file) {
      // Convert buffer to data URI for Cloudinary
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const uploadRes = await cloudinary.uploader.upload(dataUri, {
        folder: "pelapor_reports",
      });
      imagePath = uploadRes.secure_url;
      console.log("✅ Cloudinary upload:", {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
      });
    }
    const isPublic = is_public === "false" ? false : true;
    const isUrgent = is_urgent === "true" ? true : false;

    const { rows } = await pool.query(
      `INSERT INTO public_reports
         (header, body, user_id, category_id, image, latitude, longitude, address, is_public, is_urgent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        header,
        body,
        req.user.id,
        category_id || null,
        imagePath,
        latitude || null,
        longitude || null,
        address || null,
        isPublic,
        isUrgent,
      ],
    );

    // Kirim notifikasi ke semua admin & super_admin
    const admins = await pool.query(
      `SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = true`,
    );

    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, report_id, message, type)
         VALUES ($1, $2, $3, $4)`,
        [admin.id, rows[0].id, `Laporan baru masuk: "${header}"`, "info"],
      );
    }

    res.status(201).json({
      success: true,
      message: "Laporan berhasil dibuat",
      data: rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { header, body, category_id, latitude, longitude, address } =
      req.body;

    const existing = await pool.query(
      "SELECT * FROM public_reports WHERE id = $1",
      [req.params.id],
    );
    if (!existing.rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Laporan tidak ditemukan" });

    const report = existing.rows[0];
    if (report.user_id !== req.user.id && req.user.role === "user")
      return res
        .status(403)
        .json({ success: false, message: "Tidak diizinkan" });

    let imagePath = report.image;
    if (req.file) {
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const uploadRes = await cloudinary.uploader.upload(dataUri, {
        folder: "pelapor_reports",
      });
      imagePath = uploadRes.secure_url;
      console.log("✅ Cloudinary upload (update):", {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
      });
    }

    const { rows } = await pool.query(
      `UPDATE public_reports SET
         header      = COALESCE($1, header),
         body        = COALESCE($2, body),
         category_id = COALESCE($3, category_id),
         image       = $4,
         latitude    = COALESCE($5, latitude),
         longitude   = COALESCE($6, longitude),
         address     = COALESCE($7, address)
       WHERE id = $8 RETURNING *`,
      [
        header,
        body,
        category_id,
        imagePath,
        latitude,
        longitude,
        address,
        req.params.id,
      ],
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status, note, officer_name, estimated_done } = req.body;
    const validStatus = ["pending", "under_review", "approved", "rejected"];
    if (!validStatus.includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Status tidak valid" });

    // Kalau approved, officer_name wajib
    if (status === "approved" && !officer_name)
      return res.status(400).json({
        success: false,
        message: "Nama petugas wajib diisi saat menyetujui laporan",
      });

    const existing = await pool.query(
      "SELECT * FROM public_reports WHERE id = $1",
      [req.params.id],
    );
    if (!existing.rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Laporan tidak ditemukan" });

    const oldStatus = existing.rows[0].status;

    const { rows } = await pool.query(
      "UPDATE public_reports SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id],
    );

    await pool.query(
      `INSERT INTO status_history 
         (report_id, old_status, new_status, changed_by, note, officer_name, estimated_done)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.params.id,
        oldStatus,
        status,
        req.user.id,
        note || null,
        officer_name || null,
        estimated_done || null,
      ],
    );

    const statusMsg = {
      pending: "Laporan Anda sedang menunggu peninjauan",
      under_review: "Laporan Anda sedang ditinjau oleh admin",
      approved: `Laporan Anda telah disetujui. Petugas: ${officer_name}`,
      rejected: "Laporan Anda ditolak",
    };

    await pool.query(
      `INSERT INTO notifications (user_id, report_id, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        existing.rows[0].user_id,
        req.params.id,
        statusMsg[status],
        status === "approved"
          ? "success"
          : status === "rejected"
            ? "error"
            : "info",
      ],
    );

    res.json({
      success: true,
      message: "Status berhasil diperbarui",
      data: rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT * FROM public_reports WHERE id = $1",
      [req.params.id],
    );
    if (!existing.rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Laporan tidak ditemukan" });

    const report = existing.rows[0];
    if (report.user_id !== req.user.id && req.user.role === "user")
      return res
        .status(403)
        .json({ success: false, message: "Tidak diizinkan" });

    if (report.image) {
      // Attempt to delete remote Cloudinary resource if image is a Cloudinary URL
      try {
        const m = report.image.match(/upload\/v\d+\/(.+)\.[a-zA-Z]+$/);
        if (m && m[1]) {
          const publicId = m[1];
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (e) {
        // ignore deletion errors
      }
    }

    await pool.query("DELETE FROM public_reports WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true, message: "Laporan berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleVote = async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT id FROM report_votes WHERE user_id = $1 AND report_id = $2",
      [req.user.id, req.params.id],
    );
    if (existing.rows.length) {
      await pool.query(
        "DELETE FROM report_votes WHERE user_id = $1 AND report_id = $2",
        [req.user.id, req.params.id],
      );
      return res.json({
        success: true,
        message: "Vote dibatalkan",
        voted: false,
      });
    }
    await pool.query(
      "INSERT INTO report_votes (user_id, report_id) VALUES ($1, $2)",
      [req.user.id, req.params.id],
    );
    res.json({ success: true, message: "Vote ditambahkan", voted: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMapData = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.header, r.status, r.latitude, r.longitude,
              r.address, r.created_at, c.category_name, u.username
       FROM public_reports r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN users      u ON r.user_id     = u.id
       WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getStatusHistory = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sh.*, u.username
       FROM status_history sh
       LEFT JOIN users u ON sh.changed_by = u.id
       WHERE sh.report_id = $1
       ORDER BY sh.created_at ASC`,
      [req.params.id],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
