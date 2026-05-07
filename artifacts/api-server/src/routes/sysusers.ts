import { Router, type IRouter } from "express";
import { z } from "zod";
import { SysUser } from "../models/sysuser";

const router: IRouter = Router();

const CreateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(["admin", "operator", "viewer"]).optional(),
  active: z.boolean().optional(),
});

function fmt(v: InstanceType<typeof SysUser>) {
  const o = v.toObject();
  return { id: v._id.toString(), ...o, _id: undefined, __v: undefined };
}

router.get("/sysusers", async (req, res) => {
  try {
    const users = await SysUser.find().sort({ createdAt: -1 });
    res.json(users.map(fmt));
  } catch (err) {
    req.log.error(err, "Failed to list users");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/sysusers", async (req, res) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const user = await SysUser.create(parsed.data);
    res.status(201).json(fmt(user));
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "11000") {
      res.status(400).json({ error: "E-mail já cadastrado" });
      return;
    }
    req.log.error(err, "Failed to create user");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/sysusers/:id", async (req, res) => {
  const parsed = CreateUserSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const user = await SysUser.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json(fmt(user));
  } catch (err) {
    req.log.error(err, "Failed to update user");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/sysusers/:id", async (req, res) => {
  try {
    const user = await SysUser.findByIdAndDelete(req.params.id);
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json({ message: "Usuário excluído" });
  } catch (err) {
    req.log.error(err, "Failed to delete user");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
