import { Router, type IRouter } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SysUser } from "../models/sysuser";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

const CreateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  username: z.string().min(3, "Usuário deve ter no mínimo 3 caracteres"),
  password: z.string().min(6, "Senha provisória deve ter no mínimo 6 caracteres"),
  cargo: z.string().optional(),
  role: z.enum(["admin", "employee"]).optional(),
  active: z.boolean().optional(),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  cargo: z.string().optional(),
  role: z.enum(["admin", "employee"]).optional(),
  active: z.boolean().optional(),
});

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Senha provisória deve ter no mínimo 6 caracteres"),
});

function fmt(u: InstanceType<typeof SysUser>) {
  const o = u.toObject();
  return {
    id: u._id.toString(),
    name: o.name,
    username: o.username,
    cargo: o.cargo ?? "",
    role: o.role,
    active: o.active,
    mustChangePassword: o.mustChangePassword === true,
    lastPasswordChange: o.lastPasswordChange ?? null,
    createdAt: o.createdAt,
  };
}

// Verify admin password before sensitive operations
router.post("/sysusers/verify-admin", requireAdmin, async (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password) { res.status(400).json({ error: "Senha obrigatória" }); return; }
  try {
    const user = await SysUser.findById(req.session.userId);
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) { res.status(403).json({ error: "Senha incorreta" }); return; }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to verify admin password");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/sysusers", requireAdmin, async (req, res) => {
  try {
    const users = await SysUser.find().sort({ createdAt: -1 });
    res.json(users.map(fmt));
  } catch (err) {
    req.log.error(err, "Failed to list users");
    res.status(500).json({ error: "Erro interno" });
  }
});

// Create new employee — always marks mustChangePassword so first login forces setup
router.post("/sysusers", requireAdmin, async (req, res) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const hashed = await bcrypt.hash(parsed.data.password, 12);
    const user = await SysUser.create({
      ...parsed.data,
      password: hashed,
      mustChangePassword: true,   // always force first-login password setup
      lastPasswordChange: null,
    });
    res.status(201).json(fmt(user));
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "11000") {
      res.status(400).json({ error: "Usuário já existe" });
      return;
    }
    req.log.error(err, "Failed to create user");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/sysusers/:id", requireAdmin, async (req, res) => {
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.password) {
      data.password = await bcrypt.hash(parsed.data.password, 12);
      // Admin editing password marks it as provisional
      data.mustChangePassword = true;
      data.lastPasswordChange = null;
    }
    const user = await SysUser.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json(fmt(user));
  } catch (err) {
    req.log.error(err, "Failed to update user");
    res.status(500).json({ error: "Erro interno" });
  }
});

// Admin resets an employee's password — forces mustChangePassword on next login
router.post("/sysusers/:id/reset-password", requireAdmin, async (req, res) => {
  if (req.params.id === req.session.userId) {
    res.status(400).json({ error: "Use a opção 'Alterar Senha' para mudar sua própria senha" });
    return;
  }
  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  try {
    const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
    const user = await SysUser.findByIdAndUpdate(
      req.params.id,
      { password: hashed, mustChangePassword: true, lastPasswordChange: null },
      { new: true },
    );
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json({ message: `Senha de ${user.name} redefinida. O funcionário deverá criar uma nova senha no próximo login.` });
  } catch (err) {
    req.log.error(err, "Failed to reset user password");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/sysusers/:id", requireAdmin, async (req, res) => {
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
