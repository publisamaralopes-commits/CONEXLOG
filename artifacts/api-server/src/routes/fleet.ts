import { Router, type IRouter } from "express";
import { z } from "zod";
import { Fleet } from "../models/fleet";

const router: IRouter = Router();

const CreateFleetSchema = z.object({
  plate: z.string().min(1, "Placa é obrigatória"),
  type: z.string().min(1, "Tipo é obrigatório"),
  vehicleModel: z.string().min(1, "Modelo é obrigatório"),
  year: z.string().min(1, "Ano é obrigatório"),
  capacity: z.string().min(1, "Capacidade é obrigatória"),
  status: z.enum(["available", "in_use", "maintenance"]).optional(),
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
  const parsed = CreateFleetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const vehicle = await Fleet.create(parsed.data);
    res.status(201).json(fmt(vehicle));
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "11000") {
      res.status(400).json({ error: "Placa já cadastrada" });
      return;
    }
    req.log.error(err, "Failed to create vehicle");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/vehicles/:id", async (req, res) => {
  const parsed = CreateFleetSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const vehicle = await Fleet.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!vehicle) { res.status(404).json({ error: "Veículo não encontrado" }); return; }
    res.json(fmt(vehicle));
  } catch (err) {
    req.log.error(err, "Failed to update vehicle");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/vehicles/:id", async (req, res) => {
  try {
    const vehicle = await Fleet.findByIdAndDelete(req.params.id);
    if (!vehicle) { res.status(404).json({ error: "Veículo não encontrado" }); return; }
    res.json({ message: "Veículo excluído" });
  } catch (err) {
    req.log.error(err, "Failed to delete vehicle");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
