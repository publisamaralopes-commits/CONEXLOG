import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import mongoose from "mongoose";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/api", express.static("."));

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  logger.error("MONGODB_URI environment variable is not set");
  process.exit(1);
}

mongoose.connection.on("connecting", () => logger.info("Connecting to MongoDB..."));
mongoose.connection.on("connected", () => logger.info("Connected to MongoDB"));
mongoose.connection.on("error", (err) => logger.error(err, "MongoDB connection error"));
mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    tls: true,
    tlsInsecure: true,
  })
  .catch((err) => {
    logger.error(
      { message: err?.message },
      "Failed to connect to MongoDB — check MONGODB_URI and IP allowlist in Atlas",
    );
    process.exit(1);
  });

export default app;
