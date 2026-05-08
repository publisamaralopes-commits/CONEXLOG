import { Router, type IRouter } from "express";
import { z } from "zod";
import { Mural } from "../models/mural";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

const MuralSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  conteudo: z.string().min(1, "Conteúdo é obrigatório"),
  tipo: z.enum(["operacional", "aviso", "pendencia", "comunicado", "alerta"]).optional(),
  pinado: z.boolean().optional(),
  urgente: z.boolean().optional(),
});

function fmt(m: InstanceType<typeof Mural>) {
  const o = m.toObject();
  return { id: m._id.toString(), ...o, _id: undefined, __v: undefined };
}

router.get("/mural", async (req, res) => {
  try {
    const posts = await Mural.find().sort({ pinado: -1, createdAt: -1 });
    res.json(posts.map(fmt));
  } catch (err) {
    req.log.error(err, "Failed to list mural posts");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/mural", async (req, res) => {
  const parsed = MuralSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const autor = req.session?.userName || "Sistema";
    const autorId = req.session?.userId || "system";
    const post = await Mural.create({ ...parsed.data, autor, autorId });
    res.status(201).json(fmt(post));
  } catch (err) {
    req.log.error(err, "Failed to create mural post");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/mural/:id", async (req, res) => {
  const parsed = MuralSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const post = await Mural.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!post) { res.status(404).json({ error: "Post não encontrado" }); return; }
    res.json(fmt(post));
  } catch (err) {
    req.log.error(err, "Failed to update mural post");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/mural/:id", requireAdmin, async (req, res) => {
  try {
    const post = await Mural.findByIdAndDelete(req.params.id);
    if (!post) { res.status(404).json({ error: "Post não encontrado" }); return; }
    res.json({ message: "Post excluído" });
  } catch (err) {
    req.log.error(err, "Failed to delete mural post");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
