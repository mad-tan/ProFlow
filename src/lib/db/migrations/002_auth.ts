import type Database from "better-sqlite3";
import type { Migration } from "./runner";

export const migration002Auth: Migration = {
  id: "002",
  name: "add_auth_fields",
  up(db: Database.Database): void {
    // Add password_hash column to users table
    db.exec(`
      ALTER TABLE users ADD COLUMN password_hash TEXT;
    `);
  },
};
