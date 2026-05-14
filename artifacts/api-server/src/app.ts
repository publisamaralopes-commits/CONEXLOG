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

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  logger.error("MONGODB_URI environment variable is not set");
  process.exit(1);
}

const IS_PROD = process.env.NODE_ENV === "production";

const app: Express = express();
app.get("/", (_req, res) => {
  res.json({
    status: "online",
    api: "CONEXLOG"
  });
});

// Trust Replit's reverse proxy so rate-limiting, secure cookies, and
// req.ip all work correctly in production.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

app.use(session({
  secret: process.env.SESSION_SECRET || "conex-logistics-secret-key-2024",
  resave: false,
  saveUninitialized: false,
  // Pass the same TLS options that Mongoose uses so the MongoStore
  // connection can reach MongoDB Atlas in Replit's environment.
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    mongoOptions: { tls: true, tlsInsecure: true } as Record<string, unknown>,
    ttl: 8 * 60 * 60,
    autoRemove: "native",
    touchAfter: 24 * 3600,
    crypto: { secret: process.env.SESSION_SECRET || "conex-logistics-secret-key-2024" },
  }),
  cookie: {
    httpOnly: true,
    secure: IS_PROD,
    // "lax" works correctly behind Replit's reverse proxy; "strict" was
    // too aggressive and caused sessions to be dropped on cross-context
    // navigations inside the proxy infrastructure.
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Aguarde 15 minutos e tente novamente." },
  skip: () => !IS_PROD,
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use("/api/auth/login", loginLimiter);
app.use("/api", router);

app.use("/api/{*path}", (req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

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
        logger.info("Admin senha redefinida para admin123");
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
  try {
    const col = mongoose.connection.collection("sysusers");
    const indexes = await col.indexes();
    if (indexes.some((i: Record<string, unknown>) => i["key"] && typeof i["key"] === "object" && "email" in (i["key"] as object))) {
      await col.dropIndex("email_1");
      logger.info("Dropped stale email_1 index from sysusers");
    }
  } catch (err) {
    logger.warn({ err }, "Could not drop stale sysusers index");
  }
  try {
    const fleetCol = mongoose.connection.collection("fleets");
    const fleetIndexes = await fleetCol.indexes();
    if (fleetIndexes.some((i: Record<string, unknown>) => i["key"] && typeof i["key"] === "object" && "plate" in (i["key"] as object))) {
      await fleetCol.dropIndex("plate_1");
      logger.info("Dropped stale plate_1 index from fleets");
    }
  } catch (err) {
    logger.warn({ err }, "Could not drop stale fleets index");
  }
}

mongoose.connection.on("connecting", () => logger.info("Connecting to MongoDB..."));
mongoose.connection.on("connected", () => {
  logger.info("Connected to MongoDB");
  dropStaleIndexes().then(() => seedDefaultAdmin());
  cron.schedule("0 2 * * *", () => {
    logger.info("Starting scheduled daily backup...");
    runBackup();
  });
  logger.info("Daily backup scheduled at 02:00");
});
mongoose.connection.on("error", (err) => logger.error(err, "MongoDB connection error"));
mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000, tls: true, tlsInsecure: true })
  .catch((err) => {
    logger.error({ message: err?.message }, "Failed to connect to MongoDB");
    process.exit(1);
  });

export default app;
