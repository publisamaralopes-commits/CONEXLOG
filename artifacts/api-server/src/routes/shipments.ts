import { Router, type IRouter } from "express";
import { z } from "zod";
import { Shipment } from "../models/shipment";

const router: IRouter = Router();

const CreateShipmentSchema = z.object({
  orderNumber: z.string().min(1),
  driverName: z.string().min(1),
  vehiclePlate: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  currentLocation: z.string().min(1),
  status: z.enum(["waiting", "loading", "in_transit", "delivered"]).optional(),
  estimatedArrival: z.string().optional(),
  notes: z.string().optional(),
});

function fmt(v: InstanceType<typeof Shipment>) {
  const o = v.toObject();
  return { id: v._id.toString(), ...o, _id: undefined, __v: undefined };
}

router.get("/shipments", async (req, res) => {
  try {
    const items = await Shipment.find().sort({ createdAt: -1 });
    res.json(items.map(fmt));
  } catch (err) {
    req.log.error(err, "Failed to list shipments");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/shipments", async (req, res) => {
  const parsed = CreateShipmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const item = await Shipment.create(parsed.data);
    res.status(201).json(fmt(item));
  } catch (err) {
    req.log.error(err, "Failed to create shipment");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/shipments/:id", async (req, res) => {
  const parsed = CreateShipmentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const item = await Shipment.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!item) { res.status(404).json({ error: "Rastreamento não encontrado" }); return; }
    res.json(fmt(item));
  } catch (err) {
    req.log.error(err, "Failed to update shipment");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/shipments/:id", async (req, res) => {
  try {
    const item = await Shipment.findByIdAndDelete(req.params.id);
    if (!item) { res.status(404).json({ error: "Rastreamento não encontrado" }); return; }
    res.json({ message: "Excluído com sucesso" });
  } catch (err) {
    req.log.error(err, "Failed to delete shipment");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
