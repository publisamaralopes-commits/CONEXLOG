import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { logger } from "./logger";

const BACKUP_DIR = path.resolve("backups");
const KEEP_BACKUPS = 7;

export async function runBackup(): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(BACKUP_DIR, stamp);

  try {
    fs.mkdirSync(dir, { recursive: true });

    const db = mongoose.connection.db;
    if (!db) {
      logger.warn("Backup skipped — MongoDB not connected");
      return;
    }

    const cols = await db.listCollections().toArray();
    let totalDocs = 0;

    for (const col of cols) {
      const docs = await db.collection(col.name).find({}).toArray();
      fs.writeFileSync(
        path.join(dir, `${col.name}.json`),
        JSON.stringify(docs, null, 2),
      );
      totalDocs += docs.length;
    }

    fs.writeFileSync(
      path.join(dir, "_manifest.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          collections: cols.map((c) => c.name),
          totalDocuments: totalDocs,
        },
        null,
        2,
      ),
    );

    logger.info({ dir: stamp, collections: cols.length, totalDocs }, "Backup completed successfully");

    pruneOldBackups();
  } catch (err) {
    logger.error(err, "Backup failed");
  }
}

function pruneOldBackups(): void {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const entries = fs
      .readdirSync(BACKUP_DIR)
      .map((name) => {
        const full = path.join(BACKUP_DIR, name);
        return { name, full, mtime: fs.statSync(full).mtime };
      })
      .filter((e) => fs.statSync(e.full).isDirectory())
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    for (const entry of entries.slice(KEEP_BACKUPS)) {
      fs.rmSync(entry.full, { recursive: true, force: true });
      logger.info({ dir: entry.name }, "Old backup pruned");
    }
  } catch (err) {
    logger.warn(err, "Failed to prune old backups");
  }
}

export function listBackups(): Array<{ name: string; createdAt: string; collections: string[]; totalDocuments: number }> {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs
      .readdirSync(BACKUP_DIR)
      .filter((name) => fs.statSync(path.join(BACKUP_DIR, name)).isDirectory())
      .sort()
      .reverse()
      .map((name) => {
        const manifest = path.join(BACKUP_DIR, name, "_manifest.json");
        if (!fs.existsSync(manifest)) return { name, createdAt: name, collections: [], totalDocuments: 0 };
        const m = JSON.parse(fs.readFileSync(manifest, "utf8")) as { timestamp: string; collections: string[]; totalDocuments: number };
        return { name, createdAt: m.timestamp, collections: m.collections, totalDocuments: m.totalDocuments };
      });
  } catch {
    return [];
  }
}
