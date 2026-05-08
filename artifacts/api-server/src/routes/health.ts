import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { HealthCheckResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { runBackup, listBackups } from "../lib/backup";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({
    ...data,
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV ?? "development",
  });
});

// Admin: list backup snapshots
router.get("/healthz/backups", requireAdmin, (_req, res) => {
  const backups = listBackups();
  res.json({ count: backups.length, backups });
});

// Admin: trigger an on-demand backup
router.post("/healthz/backup", requireAdmin, async (req, res) => {
  req.log.info("Manual backup triggered by admin");
  runBackup(); // fire-and-forget — don't block the response
  res.json({ message: "Backup iniciado. Verifique os logs para o resultado." });
});

export default router;
