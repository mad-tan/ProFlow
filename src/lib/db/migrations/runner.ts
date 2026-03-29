import type Database from "better-sqlite3";
import { migration001Initial } from "./001_initial";
import { migration002Auth } from "./002_auth";
import { migration003Notes } from "./003_notes";
import { migration004SubtasksComments } from "./004_subtasks_comments";
import { migration005JobHunt } from "./005_job_hunt";
import { migration006JobHuntSearch } from "./006_job_hunt_search";

export interface Migration {
  id: string;
  name: string;
  up: (db: Database.Database) => void;
}

/**
 * All migrations in order. Append new migrations to the end of this array.
 */
const migrations: Migration[] = [migration001Initial, migration002Auth, migration003Notes, migration004SubtasksComments, migration005JobHunt, migration006JobHuntSearch];

/**
 * Ensure the _migrations tracking table exists.
 */
function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/**
 * Get the set of already-applied migration IDs.
 */
function getAppliedMigrations(db: Database.Database): Set<string> {
  const rows = db
    .prepare("SELECT id FROM _migrations")
    .all() as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

/**
 * Run all pending migrations inside a single transaction per migration.
 * Each migration is tracked in the _migrations table after successful application.
 */
export function runMigrations(db: Database.Database): void {
  ensureMigrationsTable(db);
  const applied = getAppliedMigrations(db);

  const insertMigration = db.prepare(
    "INSERT INTO _migrations (id, name) VALUES (?, ?)"
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    const applyMigration = db.transaction(() => {
      migration.up(db);
      insertMigration.run(migration.id, migration.name);
    });

    applyMigration();
    console.log(`[migrations] Applied: ${migration.id} - ${migration.name}`);
  }
}
