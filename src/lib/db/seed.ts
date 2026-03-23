import type Database from "better-sqlite3";

const DEFAULT_USER_ID = "default-user";

/**
 * Seed the database with a default user.
 * Called automatically on DB init. Safe to run multiple times.
 */
export function seedDefaultUser(db: Database.Database): void {
  const existingUser = db
    .prepare("SELECT id FROM users WHERE id = ?")
    .get(DEFAULT_USER_ID);

  if (existingUser) return;

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, name, timezone, preferences, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    DEFAULT_USER_ID,
    "user@productivity.local",
    "Default User",
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    JSON.stringify({ theme: "system", defaultView: "dashboard" }),
    now,
    now
  );

  console.log("[seed] Created default user.");
}

export function getDefaultUserId(): string {
  return DEFAULT_USER_ID;
}
