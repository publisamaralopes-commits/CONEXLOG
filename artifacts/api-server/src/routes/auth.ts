import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { SysUser } from "../models/sysuser";

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
    res.json({ id: user._id.toString(), name: user.name, role: user.role });
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

router.get("/auth/me", (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  res.json({ id: req.session.userId, name: req.session.userName, role: req.session.userRole });
});

export default router;
