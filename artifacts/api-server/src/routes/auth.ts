import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { SysUser } from "../models/sysuser";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    return;
  }
  try {
    const user = await SysUser.findOne({ username: username.toLowerCase().trim(), active: true });
    if (!user) {
      res.status(401).json({ error: "Usuário ou senha incorretos" });
      return;
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      res.status(401).json({ error: "Usuário ou senha incorretos" });
      return;
    }
    req.session.userId = user._id.toString();
    req.session.userName = user.name;
    req.session.userRole = user.role;
    res.json({
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword === true,
    });
  } catch (err) {
    req.log.error(err, "Login error");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Sessão encerrada" });
  });
});

router.get("/auth/me", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  try {
    const user = await SysUser.findById(req.session.userId).select("name role mustChangePassword");
    if (!user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    res.json({
      id: req.session.userId,
      name: req.session.userName,
      role: req.session.userRole,
      mustChangePassword: user.mustChangePassword === true,
    });
  } catch {
    res.json({ id: req.session.userId, name: req.session.userName, role: req.session.userRole, mustChangePassword: false });
  }
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(8, "Nova senha deve ter no mínimo 8 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(". ") });
    return;
  }
  try {
    const user = await SysUser.findById(req.session.userId);
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    const ok = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!ok) { res.status(403).json({ error: "Senha atual incorreta" }); return; }
    if (parsed.data.newPassword === parsed.data.currentPassword) {
      res.status(400).json({ error: "A nova senha deve ser diferente da senha atual" });
      return;
    }
    user.password = await bcrypt.hash(parsed.data.newPassword, 12);
    user.mustChangePassword = false;
    user.lastPasswordChange = new Date();
    await user.save();
    res.json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    req.log.error(err, "Failed to change password");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
