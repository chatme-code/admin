import { Router } from "express";
import { loginAdmin, signAdminToken, requireAdmin } from "../auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi" });
  }

  const user = await loginAdmin(username, password);
  if (!user) {
    return res.status(401).json({ error: "Username/password salah atau bukan admin" });
  }

  const token = signAdminToken(user);
  res.json({ token, username: user.username });
});

router.get("/me", requireAdmin, (req, res) => {
  res.json((req as any).adminUser);
});

export default router;
