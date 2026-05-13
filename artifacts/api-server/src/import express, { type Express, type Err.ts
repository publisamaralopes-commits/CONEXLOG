import express, { type Express, type ErrorRequestHandler, type Request, type Response } from "express";
import cors from "cors";
import * as pinoHttp from "pino-http";
import session from "express-session";
import MongoStore from "connect-mongo";
import * as rateLimit from "express-rate-limit";
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

app.set("trust proxy", 1);

// ✅ LOGGER (pino-http corrigido)
app.use(
  (pinoHttp as any).default({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// ✅ SESSION + MONGO STORE
app.use(
  session({
    secret: process.env.SESSION_SECRET || "conex-logistics-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      ttl: 8 * 60 * 60,
      autoRemove: "native",
    }),
    cookie: {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

// ✅ RATE LIMIT (corrigido compatibilidade Vercel)
const loginLimiter = (rateLimit as any).default({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas de login. Aguarde 15 minutos e tente novamente.",
  },
  skip: () => !IS_PROD,
});

// ✅ MIDDLEWARES
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Routes
app.use("/api/auth/login", loginLimiter);
app.use("/api", router);

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: `Rota não encontrada: ${req.method} ${req.path}`,
  });
});

// Error handler
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status =
    (err as any).status ||
    (err as any).statusCode ||
    500;

  const message = IS_PROD
    ? "Erro interno do servidor"
    : (err as Error).message;

  req.log?.error(err, "Unhandled route error");

  res.status(status).json({ error: message });
};

app.use(errorHandler);

// ===============================
// MongoDB connection
// ===============================
mongoose.connection.on("connecting", () => logger.info("Connecting to MongoDB..."));
mongoose.connection.on("connected", () => {
  logger.info("Connected to MongoDB");
});

mongoose.connection.on("error", (err) =>
  logger.error(err, "MongoDB connection error")
);

mongoose.connection.on("disconnected", () =>
  logger.warn("MongoDB disconnected")
);

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  })
  .catch((err) => {
    logger.error(err, "Failed to connect to MongoDB");
    process.exit(1);
  });

export default app;