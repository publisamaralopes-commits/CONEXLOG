import { Router, type IRouter } from "express";
import { z } from "zod";
import { Schedule } from "../models/schedule";

const router: IRouter = Router();

const CreateScheduleSchema = z.object({
  orderNumber: z.string().optional(),
  description: z.string().min(1, "Descrição é obrigatória"),
  origin: z.string().min(1, "Origem é obrigatória"),
  destination: z.string().min(1, "Destino é obrigatório"),
  scheduledDate: z.string().min(1, "Data é obrigatória"),
  driverName: z.string().min(1, "Motorista é obrigatório"),
  vehiclePlate: z.string().min(1, "Placa é obrigatória"),
  cargo: z.string().min(1, "Carga é obrigatória"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
});

function fmt(v: InstanceType<typeof Schedule>) {
  const o = v.toObject();
  return { id: v._id.toString(), ...o, _id: undefined, __v: undefined };
}

router.get("/schedules", async (req, res) => {
  try {
    const items = await Schedule.find().sort({ scheduledDate: 1 });
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
