import { Router } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../auth.js";
import ImageKit from "imagekit";
import { randomUUID } from "crypto";

const router = Router();
router.use(requireAdmin);

const IMAGEKIT_CONFIGURED =
  !!process.env.IMAGEKIT_PUBLIC_KEY &&
  !!process.env.IMAGEKIT_PRIVATE_KEY &&
  !!process.env.IMAGEKIT_URL_ENDPOINT &&
  !process.env.IMAGEKIT_PUBLIC_KEY.includes("xxxx") &&
  !process.env.IMAGEKIT_URL_ENDPOINT.includes("your_imagekit_id");

function getImageKit() {
  return new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY ?? "",
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY ?? "",
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT ?? "",
  });
}

async function saveImageLocally(base64Data: string, mimeType: string, imageKey: string): Promise<string> {
  const sizeBytes = Math.round(base64Data.length * 0.75);
  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO server_images (id, username, image_key, mime_type, size_bytes, base64_data)
    VALUES (${id}, 'admin', ${imageKey}, ${mimeType}, ${sizeBytes}, ${base64Data})
    ON CONFLICT (image_key) DO UPDATE
      SET base64_data = EXCLUDED.base64_data,
          mime_type   = EXCLUDED.mime_type,
          size_bytes  = EXCLUDED.size_bytes
  `);
  const updated = await db.execute(sql`SELECT id FROM server_images WHERE image_key = ${imageKey} LIMIT 1`);
  const realId = (updated.rows[0] as any)?.id ?? id;
  return `/api/imageserver/image/${realId}/data`;
}

// GET /api/gifts — list all gifts with category info
router.get("/", async (req, res) => {
  const { group_id } = req.query as Record<string, string>;
  const groupClause = group_id ? sql`AND group_id = ${parseInt(group_id)}` : sql``;

  const gifts = await db.execute(sql`
    SELECT id, name, hot_key, price, currency, num_available, num_sold,
           sort_order, group_id, group_vip_only,
           location_64x64_png, location_16x16_png,
           gift_all_message, status
    FROM virtual_gifts
    WHERE 1=1 ${groupClause}
    ORDER BY group_id ASC, sort_order ASC, id ASC
  `);

  const categories = await db.execute(sql`
    SELECT group_id, COUNT(*) as count
    FROM virtual_gifts
    GROUP BY group_id
    ORDER BY group_id ASC
  `);

  res.json({ gifts: gifts.rows, categories: categories.rows });
});

// GET /api/gifts/:id — get single gift
router.get("/:id", async (req, res) => {
  const gift = await db.execute(sql`
    SELECT * FROM virtual_gifts WHERE id = ${parseInt(req.params.id)} LIMIT 1
  `);
  if (!gift.rows.length) return res.status(404).json({ error: "Gift tidak ditemukan" });
  res.json(gift.rows[0]);
});

// POST /api/gifts — create new gift
router.post("/", async (req, res) => {
  const { name, hotKey, price, currency, groupId, sortOrder, groupVipOnly, giftAllMessage, numAvailable } = req.body;
  if (!name) return res.status(400).json({ error: "Nama gift wajib diisi" });

  try {
    const result = await db.execute(sql`
      INSERT INTO virtual_gifts (name, hot_key, price, currency, group_id, sort_order, group_vip_only, gift_all_message, num_available, status)
      VALUES (${name}, ${hotKey || null}, ${parseFloat(price) || 0}, ${currency || "MIG"}, ${parseInt(groupId) || 1}, ${parseInt(sortOrder) || 99}, ${!!groupVipOnly}, ${giftAllMessage || null}, ${numAvailable ? parseInt(numAvailable) : null}, 1)
      RETURNING *
    `);
    res.json({ success: true, gift: result.rows[0] });
  } catch (e: any) {
    if (e.message?.includes("unique") || e.message?.includes("duplicate")) {
      return res.status(400).json({ error: "Nama gift sudah ada" });
    }
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/gifts/:id — update gift info
router.patch("/:id", async (req, res) => {
  const { name, hotKey, price, currency, groupId, sortOrder, groupVipOnly, giftAllMessage, numAvailable, status } = req.body;
  const id = parseInt(req.params.id);

  try {
    await db.execute(sql`
      UPDATE virtual_gifts SET
        name = COALESCE(${name || null}, name),
        hot_key = COALESCE(${hotKey !== undefined ? hotKey : null}, hot_key),
        price = COALESCE(${price !== undefined ? parseFloat(price) : null}, price),
        currency = COALESCE(${currency || null}, currency),
        group_id = COALESCE(${groupId !== undefined ? parseInt(groupId) : null}, group_id),
        sort_order = COALESCE(${sortOrder !== undefined ? parseInt(sortOrder) : null}, sort_order),
        group_vip_only = COALESCE(${groupVipOnly !== undefined ? !!groupVipOnly : null}, group_vip_only),
        gift_all_message = COALESCE(${giftAllMessage !== undefined ? giftAllMessage : null}, gift_all_message),
        num_available = ${numAvailable !== undefined ? (numAvailable === "" || numAvailable === null ? null : parseInt(numAvailable)) : sql`num_available`},
        status = COALESCE(${status !== undefined ? parseInt(status) : null}, status)
      WHERE id = ${id}
    `);
    const updated = await db.execute(sql`SELECT * FROM virtual_gifts WHERE id = ${id} LIMIT 1`);
    res.json({ success: true, gift: updated.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/gifts/:id — delete gift
router.delete("/:id", async (req, res) => {
  await db.execute(sql`DELETE FROM virtual_gifts WHERE id = ${parseInt(req.params.id)}`);
  res.json({ success: true });
});

// POST /api/gifts/:id/upload — upload image (ImageKit atau lokal)
router.post("/:id/upload", async (req, res) => {
  const id = parseInt(req.params.id);
  const { base64Data, mimeType } = req.body;

  if (!base64Data) return res.status(400).json({ error: "Data gambar wajib diisi" });

  const gift = await db.execute(sql`SELECT * FROM virtual_gifts WHERE id = ${id} LIMIT 1`);
  if (!gift.rows.length) return res.status(404).json({ error: "Gift tidak ditemukan" });

  const g = gift.rows[0] as any;

  const sizeInBytes = Math.round(base64Data.length * 0.75);
  if (sizeInBytes > 5 * 1024 * 1024) {
    return res.status(413).json({ error: "Gambar terlalu besar. Maksimal 5MB." });
  }

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png",
    "image/gif": "gif", "image/webp": "webp",
  };
  const ext = extMap[mimeType] ?? "png";
  const safeName = String(g.name).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `gift_${safeName}.${ext}`;

  try {
    let imageUrl: string;

    if (IMAGEKIT_CONFIGURED) {
      const imagekit = getImageKit();
      const result = await imagekit.upload({
        file: base64Data,
        fileName,
        folder: "/migme/gifts",
        useUniqueFileName: false,
      });
      imageUrl = result.url;
    } else {
      const imageKey = `gift_${safeName}`;
      imageUrl = await saveImageLocally(base64Data, mimeType ?? "image/png", imageKey);
    }

    await db.execute(sql`
      UPDATE virtual_gifts
      SET location_64x64_png = ${imageUrl}, location_16x16_png = ${imageUrl}
      WHERE id = ${id}
    `);

    res.json({ success: true, imageUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Upload gambar gagal" });
  }
});

// DELETE /api/gifts/:id/image — hapus gambar gift
router.delete("/:id/image", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.execute(sql`
    UPDATE virtual_gifts SET location_64x64_png = NULL, location_16x16_png = NULL
    WHERE id = ${id}
  `);
  res.json({ success: true });
});

export default router;
