import { type Request, type Response, type NextFunction } from "express";
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userName: string;
    userRole: "admin" | "employee";
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    const acceptsJson = req.headers.accept?.includes("application/json") || req.headers["content-type"]?.includes("application/json");
    if (acceptsJson || req.method !== "GET") {
      res.status(401).json({ error: "Não autenticado. Faça login para continuar." });
    } else {
      res.redirect("/login");
    }
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  if (req.session.userRole !== "admin") {
    res.status(403).json({ error: "Acesso negado. Requer perfil Administrador." });
    return;
  }
  next();
}
