import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "admin-secret-key";

export interface AdminPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload;
  } catch {
    return null;
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = verifyAdminToken(token);
  if (!payload || !payload.isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  (req as any).adminUser = payload;
  next();
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [hashed, salt] = hash.split(".");
    if (!hashed || !salt) return false;
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const hashedBuf = Buffer.from(hashed, "hex");
    if (buf.length !== hashedBuf.length) return false;
    return timingSafeEqual(buf, hashedBuf);
  } catch {
    return false;
  }
}

export async function loginAdmin(username: string, password: string) {
  const result = await db.execute(
    sql`SELECT id, username, password, is_admin, is_suspended FROM users WHERE username = ${username} LIMIT 1`
  );
  const user = result.rows[0] as any;
  if (!user) return null;
  if (!user.is_admin) return null;
  if (user.is_suspended) return null;

  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;

  return {
    userId: user.id as string,
    username: user.username as string,
    isAdmin: true,
  };
}
