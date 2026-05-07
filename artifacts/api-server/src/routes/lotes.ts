import { Router, type IRouter } from "express";
import { z } from "zod";
import { Lote } from "../models/lote";
import mongoose from "mongoose";

const router: IRouter = Router();

const LoteItemSchema = z.object({
  cliente: z.string().min(1, "Cliente é obrigatório"),
  origem: z.string().min(1, "Origem é obrigatória"),
  cidadeOrigem: z.string().min(1, "Cidade de origem é obrigatória"),
  destino: z.string().min(1, "Destino é obrigatório"),
  cidadeDestino: z.string().min(1, "Cidade destino é obrigatória"),
  valorFrete: z.string().optional(),
  status: z.enum(["em_transito", "na_porta", "carregado"]).optional(),
});

type RawLoteItem = {
  _id: mongoose.Types.ObjectId;
  cliente: string;
  origem: string;
  cidadeOrigem: string;
  destino: string;
  cidadeDestino: string;
  valorFrete?: string;
  status: string;
};

function fmtLote(l: InstanceType<typeof Lote>) {
  const o = l.toObject() as { _id: mongoose.Types.ObjectId; __v?: unknown; loteNumber: string; items: RawLoteItem[]; createdAt?: Date };
  return {
    id: l._id.toString(),
    loteNumber: o.loteNumber,
    createdAt: o.createdAt,
    items: o.items.map((item) => ({
      id: item._id.toString(),
      cliente: item.cliente,
      origem: item.origem,
      cidadeOrigem: item.cidadeOrigem,
      destino: item.destino,
      cidadeDestino: item.cidadeDestino,
      valorFrete: item.valorFrete,
      status: item.status,
    })),
  };
}

router.get("/lotes", async (req, res) => {
  try {
    const lotes = await Lote.find().sort({ createdAt: -1 });
    res.json(lotes.map(fmtLote));
  } catch (err) {
    req.log.error(err, "Failed to list lotes");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/lotes/:id", async (req, res) => {
  try {
    const lote = await Lote.findById(req.params.id);
    if (!lote) { res.status(404).json({ error: "Lote não encontrado" }); return; }
    res.json(fmtLote(lote));
  } catch (err) {
    req.log.error(err, "Failed to get lote");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/lotes", async (req, res) => {
  try {
    const count = await Lote.countDocuments();
    const loteNumber = `LOTE-${String(count + 1).padStart(6, "0")}`;
    const lote = await Lote.create({ loteNumber, items: [] });
    res.status(201).json(fmtLote(lote));
  } catch (err) {
    req.log.error(err, "Failed to create lote");
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

router.post("/lotes/:id/items", async (req, res) => {
  const parsed = LoteItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const lote = await Lote.findById(req.params.id);
    if (!lote) { res.status(404).json({ error: "Lote não encontrado" }); return; }
    lote.items.push(parsed.data as Parameters<typeof lote.items.push>[0]);
    await lote.save();
    res.status(201).json(fmtLote(lote));
  } catch (err) {
    req.log.error(err, "Failed to add item to lote");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/lotes/:id/items/:itemId", async (req, res) => {
  const parsed = LoteItemSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const lote = await Lote.findById(req.params.id);
    if (!lote) { res.status(404).json({ error: "Lote não encontrado" }); return; }
    const item = lote.items.find((i) => i._id.toString() === req.params.itemId);
    if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
    Object.assign(item, parsed.data);
    await lote.save();
    res.json(fmtLote(lote));
  } catch (err) {
    req.log.error(err, "Failed to update item");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/lotes/:id/items/:itemId", async (req, res) => {
  try {
    const lote = await Lote.findById(req.params.id);
    if (!lote) { res.status(404).json({ error: "Lote não encontrado" }); return; }
    const itemIndex = lote.items.findIndex((i) => i._id.toString() === req.params.itemId);
    if (itemIndex === -1) { res.status(404).json({ error: "Item não encontrado" }); return; }
    lote.items.splice(itemIndex, 1);
    await lote.save();
    res.json({ message: "Item removido" });
  } catch (err) {
    req.log.error(err, "Failed to delete item");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
