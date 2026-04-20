import { Router } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../auth.js";

const router = Router();
router.use(requireAdmin);

router.get("/sessions", async (req, res) => {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const sessions = await db.execute(sql`
      SELECT id, bot_username, game_type, chatroom_id, status, pot, created_at, updated_at
      FROM bot_sessions
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);

    const count = await db.execute(sql`SELECT COUNT(*) as total FROM bot_sessions`);

    res.json({
      sessions: sessions.rows,
      total: parseInt((count.rows[0] as any).total),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch {
    res.json({ sessions: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const gameStats = await db.execute(sql`
      SELECT game_type, COUNT(*) as total_sessions,
             SUM(pot) as total_pot
      FROM bot_sessions
      GROUP BY game_type
      ORDER BY total_sessions DESC
    `);
    res.json({ gameStats: gameStats.rows });
  } catch {
    res.json({ gameStats: [] });
  }
});

export default router;
