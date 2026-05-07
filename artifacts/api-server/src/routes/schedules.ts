import { Router, type IRouter } from "express";
import { z } from "zod";
import { Schedule } from "../models/schedule";

const router: IRouter = Router();

const CreateScheduleSchema = z.object({
  cliente: z.string().min(1, "Cliente é obrigatório"),
  retirada: z.string().min(1, "Retirada é obrigatória"),
  cidadeRetirada: z.string().min(1, "Cidade de retirada é obrigatória"),
  destinatario: z.string().min(1, "Destinatário é obrigatório"),
  cidadeDestino: z.string().min(1, "Cidade destino é obrigatória"),
  terminal: z.string().min(1, "Terminal é obrigatório"),
  produto: z.string().min(1, "Produto é obrigatório"),
  numeroPGR: z.string().min(1, "Número PGR é obrigatório"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
});

function fmt(v: InstanceType<typeof Schedule>) {
  const o = v.toObject();
  return { id: v._id.toString(), ...o, _id: undefined, __v: undefined };
}

router.get("/schedules", async (req, res) => {
  try {
    const items = await Schedule.find().sort({ createdAt: -1 });
    res.json(items.map(fmt));
  } catch (err) {
    req.log.error(err, "Failed to list schedules");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/schedules", async (req, res) => {
  const parsed = CreateScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const item = await Schedule.create(parsed.data);
    res.status(201).json(fmt(item));
  } catch (err) {
    req.log.error(err, "Failed to create schedule");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/schedules/:id", async (req, res) => {
  const parsed = CreateScheduleSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const item = await Schedule.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!item) { res.status(404).json({ error: "Programação não encontrada" }); return; }
    res.json(fmt(item));
  } catch (err) {
    req.log.error(err, "Failed to update schedule");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/schedules/:id", async (req, res) => {
  try {
    const item = await Schedule.findByIdAndDelete(req.params.id);
    if (!item) { res.status(404).json({ error: "Programação não encontrada" }); return; }
    res.json({ message: "Excluído com sucesso" });
  } catch (err) {
    req.log.error(err, "Failed to delete schedule");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
