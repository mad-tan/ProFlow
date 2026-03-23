import { getDb } from '@/lib/db';
import { generateId } from '@/lib/utils/id';
import { getNow } from '@/lib/utils/dates';
import type { AuditLogEntry, AuditAction } from '@/lib/types';
import type Database from 'better-sqlite3';

export interface FindAuditLogOptions {
  action?: AuditAction;
  entityType?: string;
  dateRange?: { start: string; end: string };
  limit?: number;
  offset?: number;
}

/**
 * Converts a snake_case DB row to a camelCase entity.
 */
function rowToEntity(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    action: row.action as AuditAction,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    changes: row.changes ? JSON.parse(row.changes as string) : {},
    ipAddress: (row.ip_address as string) ?? null,
    userAgent: (row.user_agent as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export class AuditLogRepository {
  private get db(): Database.Database {
    return getDb();
  }

  /**
   * Log an audit event.
   */
  log(
    userId: string,
    entityType: string,
    entityId: string,
    action: AuditAction,
    changes?: Record<string, unknown>
  ): AuditLogEntry {
    const id = generateId();
    const now = getNow();
    const changesJson = changes ? JSON.stringify(changes) : '{}';

    this.db
      .prepare(
        `INSERT INTO audit_log (id, user_id, entity_type, entity_id, action, changes, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?)`
      )
      .run(id, userId, entityType, entityId, action, changesJson, now);

    const row = this.db
      .prepare('SELECT * FROM audit_log WHERE id = ?')
      .get(id) as Record<string, unknown>;

    return rowToEntity(row);
  }

  /**
   * Find audit logs for a specific entity.
   */
  findByEntity(entityType: string, entityId: string): AuditLogEntry[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM audit_log
         WHERE entity_type = ? AND entity_id = ?
         ORDER BY created_at DESC`
      )
      .all(entityType, entityId) as Record<string, unknown>[];

    return rows.map(rowToEntity);
  }

  /**
   * Find audit logs for a user with optional filters and pagination.
   */
  findByUser(userId: string, options: FindAuditLogOptions = {}): AuditLogEntry[] {
    const { action, entityType, dateRange, limit = 50, offset = 0 } = options;
    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (action) {
      clauses.push('action = ?');
      params.push(action);
    }

    if (entityType) {
      clauses.push('entity_type = ?');
      params.push(entityType);
    }

    if (dateRange) {
      clauses.push('created_at >= ? AND created_at <= ?');
      params.push(dateRange.start, dateRange.end);
    }

    let sql = `
      SELECT * FROM audit_log
      WHERE ${clauses.join(' AND ')}
      ORDER BY created_at DESC
    `;

    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(rowToEntity);
  }

  /**
   * Count audit log entries for a user with optional filters.
   */
  countByUser(userId: string, options: Omit<FindAuditLogOptions, 'limit' | 'offset'> = {}): number {
    const { action, entityType, dateRange } = options;
    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (action) {
      clauses.push('action = ?');
      params.push(action);
    }

    if (entityType) {
      clauses.push('entity_type = ?');
      params.push(entityType);
    }

    if (dateRange) {
      clauses.push('created_at >= ? AND created_at <= ?');
      params.push(dateRange.start, dateRange.end);
    }

    const sql = `
      SELECT COUNT(*) AS count FROM audit_log
      WHERE ${clauses.join(' AND ')}
    `;

    const row = this.db.prepare(sql).get(...params) as { count: number };
    return row.count;
  }
}
