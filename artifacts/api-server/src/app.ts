import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import MongoStore from "connect-mongo";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cron from "node-cron";
import router from "./routes";
import { logger } from "./lib/logger";
import { SysUser } from "./models/sysuser";
import { runBackup } from "./lib/backup";

// ── MONGODB_URI must be present before anything else ─────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  logger.error("MONGODB_URI environment variable is not set");
  process.exit(1);
}

const IS_PROD = process.env.NODE_ENV === "production";

const app: Express = express();

// ── Request logging ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

// ── Session with MongoDB-backed persistence ───────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || "conex-logistics-secret-key-2024",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    ttl: 8 * 60 * 60,           // 8 hours — matches cookie maxAge
    autoRemove: "native",
    touchAfter: 24 * 3600,      // re-save session at most once per day unless data changes
    crypto: { secret: process.env.SESSION_SECRET || "conex-logistics-secret-key-2024" },
  }),
  cookie: {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// ── Rate limiting — brute-force protection on login ───────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 20,                   // max 20 attempts per IP per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Aguarde 15 minutos e tente novamente." },
  skip: () => !IS_PROD,      // only enforce in production
});

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ── Login page ────────────────────────────────────────────────────────────────
app.get("/api/login", (_req, res) => {
  res.sendFile("login.html", { root: "." });
});

// ── Apply rate limiter to login endpoint ──────────────────────────────────────
app.use("/api/auth/login", loginLimiter);

// ── Application routes ────────────────────────────────────────────────────────
app.use("/api", router);

// ── Static files (authenticated) + session guard ─────────────────────────────
app.use("/api", (req, res, next) => {
  if (!req.session?.userId) {
    if (req.method === "GET" && !req.path.includes(".")) {
      res.redirect("/api/login");
      return;
    }
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  next();
}, express.static("."));

// ── 404 handler for unknown API routes ───────────────────────────────────────
app.use("/api/{*path}", (req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

// ── Global error handler (must be 4-arg for Express to treat as error middleware) ──
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = (err as { status?: number; statusCode?: number }).status
    ?? (err as { status?: number; statusCode?: number }).statusCode
    ?? 500;
  const message = IS_PROD
    ? "Erro interno do servidor"
    : ((err as Error).message ?? "Erro desconhecido");
  req.log?.error(err, "Unhandled route error");
  res.status(status).json({ error: message });
};
app.use(errorHandler);

// ── Startup routines ──────────────────────────────────────────────────────────
async function seedDefaultAdmin() {
  try {
    const admin = await SysUser.findOne({ username: "admin" });
    if (!admin) {
      const hash = await bcrypt.hash("admin123", 10);
      await SysUser.create({ name: "Administrador", username: "admin", password: hash, role: "admin", active: true });
      logger.info("Admin padrão criado — login: admin / senha: admin123");
    } else {
      const updates: Record<string, unknown> = {};
      if (!admin.active) updates.active = true;
      if (admin.role !== "admin") updates.role = "admin";
      const ok = await bcrypt.compare("admin123", admin.password);
      if (!ok) {
        updates.password = await bcrypt.hash("admin123", 10);
        updates.mustChangePassword = true;
        logger.info("Admin senha redefinida para admin123 — login obrigatório para troca de senha");
      }
      if (Object.keys(updates).length > 0) {
        await SysUser.updateOne({ _id: admin._id }, { $set: updates });
      }
    }
  } catch (err) {
    logger.error(err, "Failed to seed default admin");
  }
}

async function dropStaleIndexes() {
  // sysusers: drop legacy email_1 index
  try {
    const col = mongoose.connection.collection("sysusers");
    const indexes = await col.indexes();
    if (indexes.some((i: Record<string, unknown>) => i["key"] && typeof i["key"] === "object" && "email" in (i["key"] as object))) {
      await col.dropIndex("email_1");
      logger.info("Dropped stale email_1 index from sysusers");
    }
  } catch (err) {
    logger.warn({ err }, "Could not drop stale sysusers index — may not exist");
  }
  // fleets: drop legacy plate_1 index (renamed to placaCavalo)
  try {
    const fleetCol = mongoose.connection.collection("fleets");
    const fleetIndexes = await fleetCol.indexes();
    if (fleetIndexes.some((i: Record<string, unknown>) => i["key"] && typeof i["key"] === "object" && "plate" in (i["key"] as object))) {
      await fleetCol.dropIndex("plate_1");
      logger.info("Dropped stale plate_1 index from fleets");
    }
  } catch (err) {
    logger.warn({ err }, "Could not drop stale fleets index — may not exist");
  }
}

// ── MongoDB connection events ─────────────────────────────────────────────────
mongoose.connection.on("connecting", () => logger.info("Connecting to MongoDB..."));
mongoose.connection.on("connected", () => {
  logger.info("Connected to MongoDB");
  dropStaleIndexes().then(() => seedDefaultAdmin());

  // Daily backup at 02:00 server time
  cron.schedule("0 2 * * *", () => {
    logger.info("Starting scheduled daily backup...");
    runBackup();
  });
  logger.info("Daily backup scheduled at 02:00");
});
mongoose.connection.on("error", (err) => logger.error(err, "MongoDB connection error"));
mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected — sessions persisted in store"));

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000, tls: true, tlsInsecure: true })
  .catch((err) => {
    logger.error({ message: err?.message }, "Failed to connect to MongoDB — check MONGODB_URI and IP allowlist");
    process.exit(1);
  });

export default app;
