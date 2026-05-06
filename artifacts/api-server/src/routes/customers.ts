import { Router, type IRouter } from "express";
import { z } from "zod";
import { Customer } from "../models/customer";

const router: IRouter = Router();

const CreateCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
});

router.get("/customers", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(
      customers.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        phone: c.phone,
        createdAt: c.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error(err, "Failed to list customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customers", async (req, res) => {
  const parsed = CreateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }

  try {
    const customer = await Customer.create(parsed.data);
    res.status(201).json({
      id: customer._id.toString(),
      name: customer.name,
      phone: customer.phone,
      createdAt: customer.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to create customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    req.log.error(err, "Failed to delete customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
