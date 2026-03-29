import type Database from "better-sqlite3";
import type { Migration } from "./runner";

export const migration006JobHuntSearch: Migration = {
  id: "006",
  name: "job_hunt_search",
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS search_sessions (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query         TEXT NOT NULL,
        location      TEXT NOT NULL DEFAULT '',
        site_filter   TEXT NOT NULL DEFAULT '',
        date_filter   TEXT,
        total_results INTEGER NOT NULL DEFAULT 0,
        next_start    INTEGER NOT NULL DEFAULT 11,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_search_sessions_user_id ON search_sessions(user_id);
    `);

    // Add columns to job_listings if they don't exist
    const cols = db.prepare("PRAGMA table_info(job_listings)").all() as { name: string }[];
    const colNames = new Set(cols.map(c => c.name));

    if (!colNames.has('search_session_id')) {
      db.exec(`ALTER TABLE job_listings ADD COLUMN search_session_id TEXT REFERENCES search_sessions(id) ON DELETE SET NULL`);
    }
    if (!colNames.has('scraped_at')) {
      db.exec(`ALTER TABLE job_listings ADD COLUMN scraped_at TEXT`);
    }
  },
};
