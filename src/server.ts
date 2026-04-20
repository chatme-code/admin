import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import chatroomsRoutes from "./routes/chatrooms.js";
import creditsRoutes from "./routes/credits.js";
import merchantsRoutes from "./routes/merchants.js";
import botsRoutes from "./routes/bots.js";
import dashboardRoutes from "./routes/dashboard.js";
import giftsRoutes from "./routes/gifts.js";
import stickersRoutes from "./routes/stickers.js";
import accountsRoutes from "./routes/accounts.js";
import broadcastRoutes from "./routes/broadcast.js";
import releasesRoutes from "./routes/releases.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.ADMIN_PORT || 8080;

app.use(cors({
  origin: process.env.ADMIN_CORS_ORIGIN || "*",
  credentials: true,
}));

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chatrooms", chatroomsRoutes);
app.use("/api/credits", creditsRoutes);
app.use("/api/merchants", merchantsRoutes);
app.use("/api/bots", botsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/gifts", giftsRoutes);
app.use("/api/stickers", stickersRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/broadcast", broadcastRoutes);
app.use("/api/releases", releasesRoutes);

const apkUploadDir = process.env.APK_UPLOAD_DIR || "/app/apk-uploads";
app.use("/files", express.static(apkUploadDir, {
  setHeaders(res) {
    res.setHeader("Content-Disposition", "attachment");
  },
}));

const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));

app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[Admin Panel] Running on port ${PORT}`);
});

export default app;
