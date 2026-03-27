import type Database from "better-sqlite3";
import type { Migration } from "./runner";

export const migration003Notes: Migration = {
  id: "003",
  name: "notes",
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title      TEXT NOT NULL,
        content    TEXT NOT NULL DEFAULT '',
        is_pinned  INTEGER NOT NULL DEFAULT 0,
        tags       TEXT NOT NULL DEFAULT '[]',
        metadata   TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_notes_user_id    ON notes(user_id);
      CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
      CREATE INDEX IF NOT EXISTS idx_notes_is_pinned  ON notes(is_pinned);
    `);
  },
};
