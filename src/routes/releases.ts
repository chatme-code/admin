import { Router } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../auth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const UPLOAD_DIR = process.env.APK_UPLOAD_DIR || "/app/apk-uploads";

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const router = Router();
router.use(requireAdmin);

router.get("/", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, version_name, version_code, changelog,
             file_name, file_size, download_url, min_android, is_active, created_at
      FROM apk_releases
      ORDER BY created_at DESC
    `);
    res.json({ releases: result.rows });
  } catch (err) {
    console.error("[releases] GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      version_name, version_code, changelog,
      file_name, file_size, download_url,
      min_android, base64Data, mime_type,
    } = req.body as Record<string, any>;

    if (!version_name || !version_code || !download_url) {
      return res.status(400).json({ error: "version_name, version_code, dan download_url wajib diisi" });
    }

    let finalFileName = file_name || `migchat-v${version_code}.apk`;
    let finalUrl = download_url;

    if (base64Data && mime_type) {
      ensureUploadDir();
      const safeFileName = finalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(UPLOAD_DIR, safeFileName);
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(filePath, buffer);
      finalFileName = safeFileName;
      const webHost = process.env.WEB_HOST || "https://web.migxchat.net";
      finalUrl = `${webHost}/downloads/${safeFileName}`;
    }

    await db.execute(sql`UPDATE apk_releases SET is_active = false WHERE is_active = true`);

    const result = await db.execute(sql`
      INSERT INTO apk_releases
        (version_name, version_code, changelog, file_name, file_size, download_url, min_android, is_active)
      VALUES
        (${version_name}, ${parseInt(version_code)}, ${changelog || null},
         ${finalFileName}, ${parseInt(file_size) || 0}, ${finalUrl},
         ${parseInt(min_android) || 7}, true)
      RETURNING *
    `);

    res.json({ release: result.rows[0], message: "Rilis APK berhasil disimpan" });
  } catch (err) {
    console.error("[releases] POST error:", err);
    res.status(500).json({ error: "Gagal menyimpan rilis APK" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      version_name, version_code, changelog,
      file_name, file_size, download_url, min_android, is_active,
    } = req.body as Record<string, any>;

    const result = await db.execute(sql`
      UPDATE apk_releases SET
        version_name  = COALESCE(${version_name}, version_name),
        version_code  = COALESCE(${version_code ? parseInt(version_code) : null}, version_code),
        changelog     = COALESCE(${changelog ?? null}, changelog),
        file_name     = COALESCE(${file_name ?? null}, file_name),
        file_size     = COALESCE(${file_size != null ? parseInt(file_size) : null}, file_size),
        download_url  = COALESCE(${download_url ?? null}, download_url),
        min_android   = COALESCE(${min_android != null ? parseInt(min_android) : null}, min_android),
        is_active     = COALESCE(${is_active != null ? Boolean(is_active) : null}, is_active)
      WHERE id = ${parseInt(id)}
      RETURNING *
    `);

    if (!result.rows.length) return res.status(404).json({ error: "Rilis tidak ditemukan" });
    res.json({ release: result.rows[0], message: "Rilis APK berhasil diperbarui" });
  } catch (err) {
    console.error("[releases] PUT error:", err);
    res.status(500).json({ error: "Gagal memperbarui rilis APK" });
  }
});

router.patch("/:id/activate", async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(sql`UPDATE apk_releases SET is_active = false WHERE is_active = true`);
    const result = await db.execute(sql`
      UPDATE apk_releases SET is_active = true WHERE id = ${parseInt(id)} RETURNING *
    `);
    if (!result.rows.length) return res.status(404).json({ error: "Rilis tidak ditemukan" });
    res.json({ release: result.rows[0], message: "Rilis APK diaktifkan" });
  } catch (err) {
    console.error("[releases] PATCH activate error:", err);
    res.status(500).json({ error: "Gagal mengaktifkan rilis APK" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.execute(sql`SELECT file_name FROM apk_releases WHERE id = ${parseInt(id)}`);
    if (!existing.rows.length) return res.status(404).json({ error: "Rilis tidak ditemukan" });

    const row = existing.rows[0] as any;
    const filePath = path.join(UPLOAD_DIR, row.file_name || "");
    if (row.file_name && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db.execute(sql`DELETE FROM apk_releases WHERE id = ${parseInt(id)}`);
    res.json({ message: "Rilis APK berhasil dihapus" });
  } catch (err) {
    console.error("[releases] DELETE error:", err);
    res.status(500).json({ error: "Gagal menghapus rilis APK" });
  }
});

export default router;
