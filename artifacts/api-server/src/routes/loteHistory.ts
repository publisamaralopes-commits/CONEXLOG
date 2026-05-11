import { Router, type IRouter } from "express";
import { LoteHistory } from "../models/loteHistory";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/lote-history", requireAuth, async (req, res) => {
  try {
    const { filialId, loteId, userId, dateFrom, dateTo, limit = "100" } = req.query as Record<string, string>;
    const q: Record<string, unknown> = {};
    if (filialId) q.filialId = filialId;
    if (loteId) q.loteId = loteId;
    if (userId) q.updatedBy = userId;
    if (dateFrom || dateTo) {
      const ts: Record<string, Date> = {};
      if (dateFrom) ts.$gte = new Date(dateFrom);
      if (dateTo) ts.$lte = new Date(dateTo + "T23:59:59Z");
      q.timestamp = ts;
    }
    const history = await LoteHistory.find(q)
      .sort({ timestamp: -1 })
      .limit(Math.min(parseInt(limit, 10) || 100, 500));
    res.json(history.map((h) => {
      const o = h.toObject();
      return { ...o, id: h._id.toString(), _id: undefined, __v: undefined };
    }));
  } catch (err) {
    req.log.error(err, "Failed to list lote history");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
