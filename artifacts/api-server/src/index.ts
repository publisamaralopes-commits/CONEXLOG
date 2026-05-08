import app from "./app";
import { logger } from "./lib/logger";
import mongoose from "mongoose";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Process-level crash prevention ───────────────────────────────────────────

// Log and exit cleanly on uncaught synchronous exceptions
process.on("uncaughtException", (err) => {
  logger.error({ err: { message: err.message, stack: err.stack } }, "Uncaught exception — shutting down");
  process.exit(1);
});

// Log unhandled promise rejections — do not exit (Express 5 surfaces these as route errors)
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

// Graceful shutdown on SIGTERM (e.g. container orchestrator / Replit deploy)
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received — closing connections");
  try {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
  } catch (err) {
    logger.warn(err, "Error closing MongoDB connection during shutdown");
  }
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

// ── Start HTTP server ─────────────────────────────────────────────────────────
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
