import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import router from "./routes";
import { logger } from "./lib/logger";
import { SysUser } from "./models/sysuser";

const app: Express = express();

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
  cookie: { httpOnly: true, secure: false, maxAge: 8 * 60 * 60 * 1000 },
}));

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.get("/api/login", (_req, res) => {
  res.sendFile("login.html", { root: "." });
});

app.use("/api", router);

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

async function seedDefaultAdmin() {
  try {
    const admin = await SysUser.findOne({ username: "admin" });
    if (!admin) {
      const hash = await bcrypt.hash("admin123", 10);
      await SysUser.create({ name: "Administrador", username: "admin", password: hash, role: "admin", active: true });
      logger.info("Admin padrão criado — login: admin / senha: admin123");
    } else {
      // Ensure admin is active with correct role
      const updates: Record<string, unknown> = {};
      if (!admin.active) updates.active = true;
      if (admin.role !== "admin") updates.role = "admin";
      // If password does not match admin123, reset it so the default login always works
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

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  logger.error("MONGODB_URI environment variable is not set");
  process.exit(1);
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
  // fleets: drop legacy plate_1 index (schema was renamed to placaCavalo)
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

mongoose.connection.on("connecting", () => logger.info("Connecting to MongoDB..."));
mongoose.connection.on("connected", () => {
  logger.info("Connected to MongoDB");
  dropStaleIndexes().then(() => seedDefaultAdmin());
});
mongoose.connection.on("error", (err) => logger.error(err, "MongoDB connection error"));
mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000, tls: true, tlsInsecure: true })
  .catch((err) => {
    logger.error({ message: err?.message }, "Failed to connect to MongoDB — check MONGODB_URI and IP allowlist");
    process.exit(1);
  });

export default app;
