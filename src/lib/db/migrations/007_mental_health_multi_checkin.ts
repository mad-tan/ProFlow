import type { Migration } from "./runner";

/**
 * Drop the unique constraint on (user_id, date) for mental health check-ins
 * so users can log multiple check-ins per day.
 *
 * SQLite doesn't support DROP INDEX on a UNIQUE INDEX directly if the index
 * was created with CREATE UNIQUE INDEX. We drop it and recreate a regular index.
 */
export const migration007MentalHealthMultiCheckIn: Migration = {
  id: "007_mental_health_multi_checkin",
  name: "Allow multiple mental health check-ins per day",
  up(db) {
    // Drop the unique index that restricts one check-in per user per day
    db.exec(`DROP INDEX IF EXISTS idx_mental_health_user_date;`);
    // Recreate as a non-unique index (keeps query performance, removes the constraint)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_mental_health_user_date ON mental_health_check_ins(user_id, date);`);
  },
};
