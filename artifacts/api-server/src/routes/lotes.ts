import { Router, type IRouter } from "express";
import { z } from "zod";
import { Lote } from "../models/lote";
import { LoteHistory } from "../models/loteHistory";
import { SysUser } from "../models/sysuser";

const router: IRouter = Router();

const LoteSchema = z.object({
  cliente: z.string().min(1, "Cliente é obrigatório"),
  origem: z.string().min(1, "Origem é obrigatória"),
  cidadeOrigem: z.string().min(1, "Cidade de origem é obrigatória"),
  destino: z.string().min(1, "Destino é obrigatório"),
  cidadeDestino: z.string().min(1, "Cidade destino é obrigatória"),
  valorFrete: z.string().optional(),
  filialId: z.string().optional(),
  filialName: z.string().optional(),
  nPorta: z.number().min(0).optional(),
  emTransito: z.number().min(0).optional(),
  carregado: z.number().min(0).optional(),
});

function fmt(l: InstanceType<typeof Lote>) {
  const o = l.toObject();
  return {
    id: l._id.toString(),
    loteNumber: o.loteNumber,
    cliente: o.cliente,
    origem: o.origem,
    cidadeOrigem: o.cidadeOrigem,
    destino: o.destino,
    cidadeDestino: o.cidadeDestino,
    valorFrete: o.valorFrete ?? "",
    filialId: o.filialId ?? "",
    filialName: o.filialName ?? "",
    nPorta: o.nPorta ?? 0,
    emTransito: o.emTransito ?? 0,
    carregado: o.carregado ?? 0,
    createdAt: o.createdAt,
  };
}

router.get("/lotes", async (req, res) => {
  try {
    const lotes = await Lote.find().sort({ createdAt: -1 });
    res.json(lotes.map(fmt));
  } catch (err) {
    req.log.error(err, "Failed to list lotes");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/lotes", async (req, res) => {
  const parsed = LoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    // Use the highest existing loteNumber to avoid gaps causing duplicate-key collisions
    const last = await Lote.findOne({}, { loteNumber: 1 }).sort({ loteNumber: -1 }).lean();
    let nextNum = 1;
    if (last?.loteNumber) {
      const m = last.loteNumber.match(/(\d+)$/);
      if (m) nextNum = parseInt(m[1], 10) + 1;
    }
    const loteNumber = `LOTE-${String(nextNum).padStart(6, "0")}`;
    const lote = await Lote.create({ ...parsed.data, loteNumber, nPorta: 0, emTransito: 0, carregado: 0 });
    res.status(201).json(fmt(lote));
  } catch (err) {
    req.log.error(err, "Failed to create lote");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/lotes/:id", async (req, res) => {
  const parsed = LoteSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const lote = await Lote.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!lote) { res.status(404).json({ error: "Lote não encontrado" }); return; }
    res.json(fmt(lote));
  } catch (err) {
    req.log.error(err, "Failed to update lote");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/lotes/:id/counter", async (req, res) => {
  const { field, delta } = req.body as { field: string; delta: number };
  if (!["nPorta", "emTransito", "carregado"].includes(field) || typeof delta !== "number") {
    res.status(400).json({ error: "Campo ou delta inválido" });
    return;
  }
  try {
    const lote = await Lote.findById(req.params.id);
    if (!lote) { res.status(404).json({ error: "Lote não encontrado" }); return; }
    const current = (lote[field as keyof typeof lote] as number) ?? 0;
    const newVal = Math.max(0, current + delta);
    const updated = await Lote.findByIdAndUpdate(req.params.id, { [field]: newVal }, { new: true });

    // Save history entry (non-fatal)
    try {
      let updatedByName = "Sistema";
      const uid = req.session?.userId;
      if (uid) {
        const user = await SysUser.findById(uid).select("name").lean();
        if (user) updatedByName = (user as { name: string }).name;
      }
      await LoteHistory.create({
        loteId: req.params.id,
        loteNumber: lote.loteNumber,
        filialId: lote.filialId ?? "",
        filialName: lote.filialName ?? "",
        cliente: lote.cliente,
        field,
        oldVal: current,
        newVal,
        delta,
        updatedBy: uid ?? "",
        updatedByName,
        timestamp: new Date(),
      });
    } catch (histErr) {
      req.log.warn(histErr, "Failed to save lote history (non-fatal)");
    }

    res.json(fmt(updated!));
  } catch (err) {
    req.log.error(err, "Failed to update counter");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/lotes/:id", async (req, res) => {
  try {
    const lote = await Lote.findByIdAndDelete(req.params.id);
    if (!lote) { res.status(404).json({ error: "Lote não encontrado" }); return; }
    res.json({ message: "Lote excluído" });
  } catch (err) {
    req.log.error(err, "Failed to delete lote");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
