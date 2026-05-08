import { Router, type IRouter } from "express";
import { z } from "zod";
import { Fleet } from "../models/fleet";

const router: IRouter = Router();

const FleetSchema = z.object({
  cliente: z.string().min(1, "Cliente é obrigatório"),
  origemDestino: z.string().min(1, "Origem/Destino é obrigatório"),
  placaCavalo: z.string().min(1, "Placa do cavalo é obrigatória"),
  placaCarreta1: z.string().optional(),
  placaCarreta2: z.string().optional(),
  placaCarreta3: z.string().optional(),
  statusGR: z.enum(["liberado", "pendente", "gr", "cco", "nenhum"]).optional(),
  statusCarregamento: z.enum(["manifestado", "porta", "troca_nf", "nenhum"]).optional(),
  obs: z.string().optional(),
});

function fmt(v: InstanceType<typeof Fleet>) {
  const o = v.toObject();
  return { id: v._id.toString(), ...o, _id: undefined, __v: undefined };
}

router.get("/vehicles", async (req, res) => {
  try {
    const vehicles = await Fleet.find().sort({ createdAt: -1 });
    res.json(vehicles.map(fmt));
  } catch (err) {
    req.log.error(err, "Failed to list vehicles");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/vehicles", async (req, res) => {
  const parsed = FleetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const vehicle = await Fleet.create(parsed.data);
    res.status(201).json(fmt(vehicle));
  } catch (err) {
    req.log.error(err, "Failed to create vehicle");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/vehicles/:id", async (req, res) => {
  const parsed = FleetSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const vehicle = await Fleet.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!vehicle) { res.status(404).json({ error: "Registro não encontrado" }); return; }
    res.json(fmt(vehicle));
  } catch (err) {
    req.log.error(err, "Failed to update vehicle");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/vehicles/:id", async (req, res) => {
  try {
    const vehicle = await Fleet.findByIdAndDelete(req.params.id);
    if (!vehicle) { res.status(404).json({ error: "Registro não encontrado" }); return; }
    res.json({ message: "Excluído com sucesso" });
  } catch (err) {
    req.log.error(err, "Failed to delete vehicle");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
