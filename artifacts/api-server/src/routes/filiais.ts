import { Router, type IRouter } from "express";
import { z } from "zod";
import { Filial } from "../models/filial";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

const FilialSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  active: z.boolean().optional(),
});

function fmt(f: InstanceType<typeof Filial>) {
  const o = f.toObject();
  return { id: f._id.toString(), name: o.name, active: o.active, createdAt: o.createdAt };
}

router.get("/filiais", requireAuth, async (req, res) => {
  try {
    const filiais = await Filial.find().sort({ name: 1 });
    res.json(filiais.map(fmt));
  } catch (err) {
    req.log.error(err, "Failed to list filiais");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/filiais", requireAdmin, async (req, res) => {
  const parsed = FilialSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const filial = await Filial.create(parsed.data);
    res.status(201).json(fmt(filial));
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "11000") {
      res.status(400).json({ error: "Filial já existe" });
      return;
    }
    req.log.error(err, "Failed to create filial");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/filiais/:id", requireAdmin, async (req, res) => {
  const parsed = FilialSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const filial = await Filial.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!filial) { res.status(404).json({ error: "Filial não encontrada" }); return; }
    res.json(fmt(filial));
  } catch (err) {
    req.log.error(err, "Failed to update filial");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/filiais/:id", requireAdmin, async (req, res) => {
  try {
    const filial = await Filial.findByIdAndDelete(req.params.id);
    if (!filial) { res.status(404).json({ error: "Filial não encontrada" }); return; }
    res.json({ message: "Filial excluída" });
  } catch (err) {
    req.log.error(err, "Failed to delete filial");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
