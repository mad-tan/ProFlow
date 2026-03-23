import { BaseRepository } from './base.repository';
import type { Checklist, ChecklistItem } from '@/lib/types';
import { getNow } from '@/lib/utils/dates';
import { generateId } from '@/lib/utils/id';

export interface ChecklistWithItems extends Checklist {
  items: ChecklistItem[];
}

export interface FindChecklistsOptions {
  isTemplate?: boolean;
  projectId?: string;
}

export class ChecklistRepository extends BaseRepository<Checklist> {
  constructor() {
    super('checklists');
  }

  /**
   * Find checklists for a user with optional filters.
   */
  findByUserId(userId: string, options: FindChecklistsOptions = {}): Checklist[] {
    const { isTemplate, projectId } = options;
    const clauses: string[] = ['c.user_id = ?'];
    const params: unknown[] = [userId];

    if (isTemplate !== undefined) {
      clauses.push('c.is_template = ?');
      params.push(isTemplate ? 1 : 0);
    }

    if (projectId) {
      clauses.push('c.project_id = ?');
      params.push(projectId);
    }

    const sql = `
      SELECT c.*
      FROM checklists c
      WHERE ${clauses.join(' AND ')}
      ORDER BY c.sort_order ASC, c.created_at DESC
    `;

    return this.query<Checklist>(sql, params);
  }

  /**
   * Find all template checklists for a user.
   */
  findTemplates(userId: string): Checklist[] {
    return this.findByUserId(userId, { isTemplate: true });
  }

  /**
   * Get a checklist with all its items.
   */
  getWithItems(checklistId: string): ChecklistWithItems | undefined {
    const checklist = this.findById(checklistId);
    if (!checklist) return undefined;

    const items = this.query<ChecklistItem>(
      `SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC`,
      [checklistId]
    );

    return { ...checklist, items };
  }

  /**
   * Create a new checklist from a template, duplicating its items.
   */
  createFromTemplate(templateId: string, userId: string): ChecklistWithItems {
    const template = this.getWithItems(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    const now = getNow();
    const newId = generateId();

    // Create the checklist (not a template)
    this.execute(
      `INSERT INTO checklists (id, user_id, title, description, is_template, sort_order, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 0, '{}', ?, ?)`,
      [newId, userId, template.title, template.description, now, now]
    );

    // Duplicate items
    for (const item of template.items) {
      const itemId = generateId();
      this.execute(
        `INSERT INTO checklist_items (id, checklist_id, content, is_completed, sort_order, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, NULL, ?, ?)`,
        [itemId, newId, item.content, item.sortOrder, now, now]
      );
    }

    return this.getWithItems(newId) as ChecklistWithItems;
  }

  /**
   * Add a new item to a checklist.
   */
  addItem(checklistId: string, title: string, sortOrder: number): ChecklistItem {
    const now = getNow();
    const id = generateId();

    this.execute(
      `INSERT INTO checklist_items (id, checklist_id, content, is_completed, sort_order, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, NULL, ?, ?)`,
      [id, checklistId, title, sortOrder, now, now]
    );

    return this.queryOne<ChecklistItem>(
      'SELECT * FROM checklist_items WHERE id = ?',
      [id]
    ) as ChecklistItem;
  }

  /**
   * Update an existing checklist item.
   */
  updateItem(itemId: string, data: Partial<Pick<ChecklistItem, 'content' | 'isCompleted' | 'sortOrder'>>): ChecklistItem {
    const now = getNow();
    const sets: string[] = ['updated_at = ?'];
    const params: unknown[] = [now];

    if (data.content !== undefined) {
      sets.push('content = ?');
      params.push(data.content);
    }
    if (data.isCompleted !== undefined) {
      sets.push('is_completed = ?');
      params.push(data.isCompleted ? 1 : 0);
      if (data.isCompleted) {
        sets.push('completed_at = ?');
        params.push(now);
      } else {
        sets.push('completed_at = NULL');
      }
    }
    if (data.sortOrder !== undefined) {
      sets.push('sort_order = ?');
      params.push(data.sortOrder);
    }

    params.push(itemId);
    this.execute(
      `UPDATE checklist_items SET ${sets.join(', ')} WHERE id = ?`,
      params
    );

    return this.queryOne<ChecklistItem>(
      'SELECT * FROM checklist_items WHERE id = ?',
      [itemId]
    ) as ChecklistItem;
  }

  /**
   * Delete a checklist item.
   */
  deleteItem(itemId: string): boolean {
    const result = this.execute(
      'DELETE FROM checklist_items WHERE id = ?',
      [itemId]
    );
    return result.changes > 0;
  }

  /**
   * Reorder items in a checklist by updating their sort_order to match
   * the position in the provided itemIds array.
   */
  reorderItems(checklistId: string, itemIds: string[]): void {
    const now = getNow();
    const updateStmt = this.db.prepare(
      'UPDATE checklist_items SET sort_order = ?, updated_at = ? WHERE id = ? AND checklist_id = ?'
    );

    const transaction = this.db.transaction(() => {
      itemIds.forEach((id, index) => {
        updateStmt.run(index, now, id, checklistId);
      });
    });

    transaction();
  }

  /**
   * Toggle the completion status of a checklist item.
   */
  toggleItem(itemId: string): ChecklistItem {
    const item = this.queryOne<ChecklistItem>(
      'SELECT * FROM checklist_items WHERE id = ?',
      [itemId]
    );
    if (!item) {
      throw new Error(`ChecklistItem '${itemId}' not found`);
    }

    return this.updateItem(itemId, { isCompleted: !item.isCompleted });
  }
}
