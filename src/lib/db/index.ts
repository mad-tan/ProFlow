import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { runMigrations } from "./migrations/runner";
import { seedDefaultUser } from "./seed";

let db: Database.Database | null = null;
let migrated = false;

/**
 * Get the singleton database instance.
 * On first call, creates the data directory if needed, opens the database,
 * enables WAL mode and foreign keys, and runs pending migrations.
 */
export function getDb(): Database.Database {
  if (!db) {
    const dbPath =
      process.env.DATABASE_PATH ||
      path.join(process.cwd(), "data", "productivity.db");

    // Ensure the data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);

    // Performance and integrity pragmas
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    db.pragma("synchronous = NORMAL");
    db.pragma("cache_size = -20000"); // 20 MB

    // Run migrations on first connection
    if (!migrated) {
      runMigrations(db);
      seedDefaultUser(db);
      migrated = true;
    }
  }

  return db;
}

/**
 * Close the database connection and reset the singleton.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    migrated = false;
  }
}

/**
 * Run a callback inside a database transaction.
 * Automatically rolls back on error.
 */
export function withTransaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDb();
  const transaction = database.transaction(() => fn(database));
  return transaction();
}
