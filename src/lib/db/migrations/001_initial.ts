import type Database from "better-sqlite3";
import type { Migration } from "./runner";

export const migration001Initial: Migration = {
  id: "001",
  name: "initial_schema",
  up(db: Database.Database): void {
    db.exec(`
      -- ─── Users ───────────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        name          TEXT NOT NULL,
        avatar_url    TEXT,
        timezone      TEXT NOT NULL DEFAULT 'UTC',
        preferences   TEXT NOT NULL DEFAULT '{}',
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- ─── Projects ────────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS projects (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        name          TEXT NOT NULL,
        description   TEXT,
        status        TEXT NOT NULL DEFAULT 'active',
        color         TEXT,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        metadata      TEXT NOT NULL DEFAULT '{}',
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

      -- ─── Tasks ───────────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS tasks (
        id                TEXT PRIMARY KEY,
        project_id        TEXT,
        user_id           TEXT NOT NULL,
        title             TEXT NOT NULL,
        description       TEXT,
        status            TEXT NOT NULL DEFAULT 'todo',
        priority          TEXT NOT NULL DEFAULT 'none',
        due_date          TEXT,
        estimated_minutes INTEGER,
        actual_minutes    INTEGER,
        tags              TEXT NOT NULL DEFAULT '[]',
        sort_order        INTEGER NOT NULL DEFAULT 0,
        completed_at      TEXT,
        metadata          TEXT NOT NULL DEFAULT '{}',
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

      -- ─── Task Dependencies ───────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id                TEXT PRIMARY KEY,
        task_id           TEXT NOT NULL,
        depends_on_task_id TEXT NOT NULL,
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        UNIQUE(task_id, depends_on_task_id)
      );

      CREATE INDEX IF NOT EXISTS idx_task_deps_task_id ON task_dependencies(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_deps_depends_on ON task_dependencies(depends_on_task_id);

      -- ─── Time Entries ────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS time_entries (
        id                TEXT PRIMARY KEY,
        task_id           TEXT,
        user_id           TEXT NOT NULL,
        description       TEXT,
        start_time        TEXT NOT NULL,
        end_time          TEXT,
        duration_minutes  INTEGER,
        metadata          TEXT NOT NULL DEFAULT '{}',
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);

      -- ─── Mental Health Check-Ins ─────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS mental_health_check_ins (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        date          TEXT NOT NULL,
        mood_rating   INTEGER NOT NULL,
        energy_level  INTEGER NOT NULL,
        stress_level  INTEGER NOT NULL,
        sleep_hours   REAL,
        notes         TEXT,
        tags          TEXT NOT NULL DEFAULT '[]',
        metadata      TEXT NOT NULL DEFAULT '{}',
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_mental_health_user_id ON mental_health_check_ins(user_id);
      CREATE INDEX IF NOT EXISTS idx_mental_health_date ON mental_health_check_ins(date);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mental_health_user_date ON mental_health_check_ins(user_id, date);

      -- ─── Journal Entries ─────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS journal_entries (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        title         TEXT,
        content       TEXT NOT NULL,
        tags          TEXT NOT NULL DEFAULT '[]',
        mood          INTEGER,
        metadata      TEXT NOT NULL DEFAULT '{}',
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(created_at);

      -- ─── Checklists ──────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS checklists (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        title         TEXT NOT NULL,
        description   TEXT,
        is_template   INTEGER NOT NULL DEFAULT 0,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        metadata      TEXT NOT NULL DEFAULT '{}',
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_checklists_user_id ON checklists(user_id);

      -- ─── Checklist Items ─────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS checklist_items (
        id            TEXT PRIMARY KEY,
        checklist_id  TEXT NOT NULL,
        content       TEXT NOT NULL,
        is_completed  INTEGER NOT NULL DEFAULT 0,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        completed_at  TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);

      -- ─── Reminders ───────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS reminders (
        id                TEXT PRIMARY KEY,
        user_id           TEXT NOT NULL,
        task_id           TEXT,
        title             TEXT NOT NULL,
        description       TEXT,
        remind_at         TEXT NOT NULL,
        frequency         TEXT NOT NULL DEFAULT 'once',
        is_active         INTEGER NOT NULL DEFAULT 1,
        last_triggered_at TEXT,
        metadata          TEXT NOT NULL DEFAULT '{}',
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
      CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
      CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON reminders(is_active);

      -- ─── AI Chat Messages ────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        session_id    TEXT NOT NULL,
        role          TEXT NOT NULL,
        content       TEXT NOT NULL,
        metadata      TEXT NOT NULL DEFAULT '{}',
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ai_chat_user_id ON ai_chat_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_chat_session_id ON ai_chat_messages(session_id);

      -- ─── Audit Log ───────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS audit_log (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        action        TEXT NOT NULL,
        entity_type   TEXT NOT NULL,
        entity_id     TEXT NOT NULL,
        changes       TEXT NOT NULL DEFAULT '{}',
        ip_address    TEXT,
        user_agent    TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
    `);
  },
};
