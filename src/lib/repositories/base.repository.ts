import type Database from 'better-sqlite3';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/utils/id';
import { getNow } from '@/lib/utils/dates';

export interface FindAllOptions {
  where?: Record<string, unknown>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

/**
 * Converts a camelCase string to snake_case for DB column mapping.
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Converts a snake_case string to camelCase for mapping DB rows to TS objects.
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Map a DB row (snake_case keys) to a TS object (camelCase keys).
 */
/** Columns that are stored as INTEGER 0/1 but should be returned as boolean. */
const BOOLEAN_COLUMNS = new Set(['is_template', 'is_completed', 'is_active', 'is_pinned']);

function rowToEntity<T>(row: Record<string, unknown>): T {
  const entity: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = snakeToCamel(key);
    // Try to parse JSON strings for metadata/preferences/tags columns
    if (typeof value === 'string' && (camelKey === 'metadata' || camelKey === 'preferences' || camelKey === 'tags')) {
      try { entity[camelKey] = JSON.parse(value); } catch { entity[camelKey] = value; }
    } else if (BOOLEAN_COLUMNS.has(key) && typeof value === 'number') {
      entity[camelKey] = value === 1;
    } else {
      entity[camelKey] = value;
    }
  }
  return entity as T;
}

/**
 * Map a TS object (camelCase keys) to DB columns (snake_case keys).
 */
function entityToRow(data: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    // JSON-serialize objects and arrays for TEXT columns in SQLite
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      row[camelToSnake(key)] = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      // SQLite does not support booleans; store as 0/1
      row[camelToSnake(key)] = value ? 1 : 0;
    } else {
      row[camelToSnake(key)] = value;
    }
  }
  return row;
}

/**
 * Generic base repository providing standard CRUD operations.
 * All queries use parameterized statements to prevent SQL injection.
 */
export class BaseRepository<T extends { id: string }> {
  protected readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected get db(): Database.Database {
    return getDb();
  }

  /**
   * Find a single record by its primary key.
   */
  findById(id: string): T | undefined {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? rowToEntity<T>(row) : undefined;
  }

  /**
   * Find multiple records with optional filtering, ordering, and pagination.
   */
  findAll(options: FindAllOptions = {}): T[] {
    const { where, orderBy, limit, offset } = options;
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (where) {
      for (const [key, value] of Object.entries(where)) {
        const column = camelToSnake(key);
        if (value === null) {
          clauses.push(`${column} IS NULL`);
        } else {
          clauses.push(`${column} = ?`);
          params.push(value);
        }
      }
    }

    let sql = `SELECT * FROM ${this.tableName}`;
    if (clauses.length > 0) {
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }
    if (orderBy) {
      // orderBy is trusted (set by application code, not user input)
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }
    if (offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(offset);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((row) => rowToEntity<T>(row));
  }

  /**
   * Create a new record. Automatically generates id, createdAt, updatedAt.
   */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
    const now = getNow();
    const id = generateId();
    const fullData: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
      id,
      createdAt: now,
      updatedAt: now,
    };

    const row = entityToRow(fullData);
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => row[col]);

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    this.db.prepare(sql).run(...values);

    return this.findById(id) as T;
  }

  /**
   * Update an existing record by id. Automatically bumps updatedAt.
   */
  update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): T {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`${this.tableName} with id '${id}' not found`);
    }

    const now = getNow();
    const updateData: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
      updatedAt: now,
    };

    const row = entityToRow(updateData);
    const setClauses = Object.keys(row).map((col) => `${col} = ?`);
    const values = Object.values(row);

    const sql = `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values, id);

    return this.findById(id) as T;
  }

  /**
   * Delete a record by id. Returns true if a row was deleted.
   */
  delete(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  /**
   * Count records matching an optional where clause.
   */
  count(where?: Record<string, unknown>): number {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (where) {
      for (const [key, value] of Object.entries(where)) {
        const column = camelToSnake(key);
        if (value === null) {
          clauses.push(`${column} IS NULL`);
        } else {
          clauses.push(`${column} = ?`);
          params.push(value);
        }
      }
    }

    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (clauses.length > 0) {
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    const row = this.db.prepare(sql).get(...params) as { count: number };
    return row.count;
  }

  /**
   * Execute a raw parameterized query and return mapped results.
   */
  protected query<R = T>(sql: string, params: unknown[] = []): R[] {
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((row) => rowToEntity<R>(row));
  }

  /**
   * Execute a raw parameterized query and return a single mapped result.
   */
  protected queryOne<R = T>(sql: string, params: unknown[] = []): R | undefined {
    const row = this.db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
    return row ? rowToEntity<R>(row) : undefined;
  }

  /**
   * Execute a raw parameterized statement (INSERT/UPDATE/DELETE).
   */
  protected execute(sql: string, params: unknown[] = []): Database.RunResult {
    return this.db.prepare(sql).run(...params);
  }
}
