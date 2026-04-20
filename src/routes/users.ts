import { Router } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../auth.js";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function ensureAdminLogsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id SERIAL PRIMARY KEY,
      action VARCHAR(20) NOT NULL,
      target_user_id INTEGER NOT NULL,
      target_username VARCHAR(255) NOT NULL,
      performed_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

ensureAdminLogsTable().catch(console.error);

const router = Router();
router.use(requireAdmin);

router.get("/", async (req, res) => {
  const { page = "1", limit = "20", search = "" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const searchClause = search
    ? sql`AND (u.username ILIKE ${"%" + search + "%"} OR u.email ILIKE ${"%" + search + "%"})`
    : sql``;

  const users = await db.execute(sql`
    SELECT u.id, u.username, u.display_name, u.email, u.email_verified,
           u.is_admin, u.is_suspended, u.created_at,
           p.mig_level, p.country, p.display_picture,
           ca.balance, ca.currency
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    LEFT JOIN credit_accounts ca ON ca.username = u.username
    WHERE 1=1 ${searchClause}
    ORDER BY u.created_at DESC
    LIMIT ${parseInt(limit)} OFFSET ${offset}
  `);

  const count = await db.execute(sql`
    SELECT COUNT(*) as total FROM users u
    WHERE 1=1 ${searchClause}
  `);

  res.json({
    users: users.rows,
    total: parseInt((count.rows[0] as any).total),
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

router.get("/admin-logs", async (req, res) => {
  const { limit = "50" } = req.query as Record<string, string>;

  try {
    const logs = await db.execute(sql`
      SELECT id, action, target_user_id, target_username, performed_by, created_at
      FROM admin_activity_logs
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)}
    `);
    res.json({ logs: logs.rows });
  } catch {
    res.json({ logs: [] });
  }
});

router.post("/special", async (req, res) => {
  const { username, displayName, email, password, country, gender } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, dan password wajib diisi" });
  }
  if (username.length < 1 || username.length > 18) {
    return res.status(400).json({ error: "Username harus 1-18 karakter" });
  }

  try {
    const existUser = await db.execute(sql`SELECT id FROM users WHERE username = ${username} OR email = ${email} LIMIT 1`);
    if (existUser.rows.length > 0) {
      return res.status(409).json({ error: "Username atau email sudah terdaftar" });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await db.execute(sql`
      INSERT INTO users (username, display_name, email, password, email_verified)
      VALUES (${username}, ${displayName || username}, ${email}, ${hashedPassword}, true)
      RETURNING id, username, display_name, email
    `);

    const userId = (newUser.rows[0] as any).id;
    await db.execute(sql`
      INSERT INTO user_profiles (user_id, country, gender)
      VALUES (${userId}, ${country || null}, ${gender || null})
    `);

    res.status(201).json({ success: true, user: newUser.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal membuat akun" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const user = await db.execute(sql`
    SELECT u.id, u.username, u.display_name, u.email, u.email_verified,
           u.is_admin, u.is_suspended, u.created_at,
           p.mig_level, p.country, p.city, p.gender, p.about_me, p.display_picture,
           ca.balance, ca.currency, ca.funded_balance
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    LEFT JOIN credit_accounts ca ON ca.username = u.username
    WHERE u.id = ${id}
    LIMIT 1
  `);

  if (!user.rows.length) return res.status(404).json({ error: "User tidak ditemukan" });
  res.json(user.rows[0]);
});

router.patch("/:id/suspend", async (req, res) => {
  const { id } = req.params;
  const { isSuspended } = req.body;

  await db.execute(sql`
    UPDATE users SET is_suspended = ${!!isSuspended} WHERE id = ${id}
  `);
  res.json({ success: true });
});

router.patch("/:id/admin", async (req, res) => {
  const { id } = req.params;
  const { isAdmin } = req.body;
  const performedBy = (req as any).adminUser?.username || "unknown";

  await db.execute(sql`
    UPDATE users SET is_admin = ${!!isAdmin} WHERE id = ${id}
  `);

  try {
    const targetUser = await db.execute(sql`
      SELECT username FROM users WHERE id = ${id} LIMIT 1
    `);
    const targetUsername = (targetUser.rows[0] as any)?.username || "unknown";
    const action = isAdmin ? "grant" : "revoke";

    await db.execute(sql`
      INSERT INTO admin_activity_logs (action, target_user_id, target_username, performed_by)
      VALUES (${action}, ${parseInt(id)}, ${targetUsername}, ${performedBy})
    `);
  } catch (logErr) {
    console.error("Failed to write admin log:", logErr);
  }

  res.json({ success: true });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await db.execute(sql`DELETE FROM users WHERE id = ${id}`);
  res.json({ success: true });
});

export default router;
