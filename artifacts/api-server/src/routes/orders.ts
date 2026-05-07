import { Router, type IRouter } from "express";
import { z } from "zod";
import { LoadOrder } from "../models/loadOrder";

const router: IRouter = Router();

const DriverSchema = z.object({
  name: z.string().min(1, "Nome do motorista é obrigatório"),
  cpf: z.string().min(1, "CPF é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  cnhNumber: z.string().min(1, "Número da CNH é obrigatório"),
  cnhExpiry: z.string().min(1, "Validade da CNH é obrigatória"),
  cnhImage: z.string().optional(),
});

const VehicleDataSchema = z.object({
  plate: z.string().min(1, "Placa é obrigatória"),
  type: z.string().min(1, "Tipo do veículo é obrigatório"),
  model: z.string().min(1, "Modelo é obrigatório"),
});

const CargoSchema = z.object({
  description: z.string().min(1, "Descrição da carga é obrigatória"),
  weight: z.string().min(1, "Peso é obrigatório"),
  volume: z.string().optional(),
  origin: z.string().min(1, "Origem é obrigatória"),
  destination: z.string().min(1, "Destino é obrigatório"),
  notes: z.string().optional(),
});

const CreateOrderSchema = z.object({
  status: z.enum(["pending", "loading", "in_transit", "delivered", "cancelled"]).optional(),
  driver: DriverSchema,
  vehicle: VehicleDataSchema,
  cargo: CargoSchema,
});

const UpdateOrderSchema = CreateOrderSchema.partial();

function formatOrder(o: InstanceType<typeof LoadOrder>) {
  const obj = o.toObject();
  return { id: o._id.toString(), ...obj, _id: undefined, __v: undefined };
}

router.get("/orders", async (req, res) => {
  try {
    const orders = await LoadOrder.find().sort({ createdAt: -1 });
    res.json(orders.map(formatOrder));
  } catch (err) {
    req.log.error(err, "Failed to list orders");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const order = await LoadOrder.findById(req.params.id);
    if (!order) { res.status(404).json({ error: "Ordem não encontrada" }); return; }
    res.json(formatOrder(order));
  } catch (err) {
    req.log.error(err, "Failed to get order");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/orders", async (req, res) => {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const count = await LoadOrder.countDocuments();
    const orderNumber = `OC-${String(count + 1).padStart(6, "0")}`;
    const order = await LoadOrder.create({ ...parsed.data, orderNumber });
    res.status(201).json(formatOrder(order));
  } catch (err) {
    req.log.error(err, "Failed to create order");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/orders/:id", async (req, res) => {
  const parsed = UpdateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const order = await LoadOrder.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!order) { res.status(404).json({ error: "Ordem não encontrada" }); return; }
    res.json(formatOrder(order));
  } catch (err) {
    req.log.error(err, "Failed to update order");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    const order = await LoadOrder.findByIdAndDelete(req.params.id);
    if (!order) { res.status(404).json({ error: "Ordem não encontrada" }); return; }
    res.json({ message: "Ordem excluída com sucesso" });
  } catch (err) {
    req.log.error(err, "Failed to delete order");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
