import type Database from "better-sqlite3";
import type { Migration } from "./runner";

export const migration005JobHunt: Migration = {
  id: "005",
  name: "job_hunt",
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS resumes (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name   TEXT NOT NULL,
        file_path   TEXT NOT NULL,
        raw_text    TEXT NOT NULL DEFAULT '',
        parsed_data TEXT NOT NULL DEFAULT '{}',
        skills      TEXT NOT NULL DEFAULT '[]',
        experience  TEXT NOT NULL DEFAULT '[]',
        education   TEXT NOT NULL DEFAULT '[]',
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

      CREATE TABLE IF NOT EXISTS job_listings (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title         TEXT NOT NULL,
        company       TEXT NOT NULL,
        location      TEXT NOT NULL DEFAULT '',
        salary_range  TEXT,
        job_type      TEXT,
        url           TEXT,
        description   TEXT NOT NULL DEFAULT '',
        requirements  TEXT NOT NULL DEFAULT '[]',
        score         REAL,
        score_reasons TEXT NOT NULL DEFAULT '[]',
        source        TEXT,
        status        TEXT NOT NULL DEFAULT 'saved',
        tags          TEXT NOT NULL DEFAULT '[]',
        metadata      TEXT NOT NULL DEFAULT '{}',
        applied_at    TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_job_listings_user_id ON job_listings(user_id);
      CREATE INDEX IF NOT EXISTS idx_job_listings_status  ON job_listings(status);

      CREATE TABLE IF NOT EXISTS applications (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        listing_id      TEXT NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
        resume_version  TEXT,
        cover_letter    TEXT,
        applied_via     TEXT NOT NULL DEFAULT 'direct',
        applied_at      TEXT,
        status          TEXT NOT NULL DEFAULT 'pending',
        notes           TEXT,
        follow_up_date  TEXT,
        metadata        TEXT NOT NULL DEFAULT '{}',
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_applications_user_id    ON applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_applications_listing_id ON applications(listing_id);
      CREATE INDEX IF NOT EXISTS idx_applications_status     ON applications(status);

      CREATE TABLE IF NOT EXISTS cold_emails (
        id                TEXT PRIMARY KEY,
        user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        listing_id        TEXT REFERENCES job_listings(id) ON DELETE SET NULL,
        recipient_name    TEXT NOT NULL,
        recipient_email   TEXT NOT NULL,
        recipient_title   TEXT,
        company           TEXT NOT NULL,
        subject           TEXT NOT NULL,
        body              TEXT NOT NULL,
        status            TEXT NOT NULL DEFAULT 'drafted',
        sent_at           TEXT,
        follow_up_count   INTEGER NOT NULL DEFAULT 0,
        last_follow_up_at TEXT,
        created_at        TEXT NOT NULL,
        updated_at        TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cold_emails_user_id    ON cold_emails(user_id);
      CREATE INDEX IF NOT EXISTS idx_cold_emails_listing_id ON cold_emails(listing_id);

      CREATE TABLE IF NOT EXISTS linkedin_outreaches (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        listing_id   TEXT REFERENCES job_listings(id) ON DELETE SET NULL,
        person_name  TEXT NOT NULL,
        person_title TEXT,
        person_url   TEXT,
        company      TEXT NOT NULL,
        message      TEXT NOT NULL,
        status       TEXT NOT NULL DEFAULT 'drafted',
        sent_at      TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_linkedin_outreaches_user_id    ON linkedin_outreaches(user_id);
      CREATE INDEX IF NOT EXISTS idx_linkedin_outreaches_listing_id ON linkedin_outreaches(listing_id);
    `);
  },
};
