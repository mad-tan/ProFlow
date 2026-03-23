import {
  ChecklistRepository,
  type ChecklistWithItems,
  type FindChecklistsOptions,
} from '@/lib/repositories/checklist.repository';
import { AuditLogRepository } from '@/lib/repositories/audit-log.repository';
import { NotFoundError } from '@/lib/utils/errors';
import type { Checklist, ChecklistItem } from '@/lib/types';

export interface CreateChecklistInput {
  userId: string;
  title: string;
  description?: string | null;
  isTemplate?: boolean;
  projectId?: string | null;
}

export interface UpdateChecklistInput {
  title?: string;
  description?: string | null;
}

export interface ChecklistProgress {
  total: number;
  completed: number;
  percentage: number;
}

export class ChecklistService {
  private repo = new ChecklistRepository();
  private auditLog = new AuditLogRepository();

  /**
   * Get a checklist by id. Throws if not found.
   */
  getById(id: string): Checklist {
    const checklist = this.repo.findById(id);
    if (!checklist) throw new NotFoundError('Checklist', id);
    return checklist;
  }

  /**
   * Get a checklist with all its items.
   */
  getWithItems(id: string): ChecklistWithItems {
    const checklist = this.repo.getWithItems(id);
    if (!checklist) throw new NotFoundError('Checklist', id);
    return checklist;
  }

  /**
   * List checklists for a user.
   */
  listByUser(userId: string, options?: FindChecklistsOptions): Checklist[] {
    return this.repo.findByUserId(userId, options);
  }

  /**
   * List templates for a user.
   */
  listTemplates(userId: string): Checklist[] {
    return this.repo.findTemplates(userId);
  }

  /**
   * Create a new checklist.
   */
  create(input: CreateChecklistInput): Checklist {
    const checklist = this.repo.create({
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,
      isTemplate: input.isTemplate ?? false,
      sortOrder: 0,
      metadata: {},
    } as Omit<Checklist, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'checklist', checklist.id, 'create', {
      title: checklist.title,
      isTemplate: input.isTemplate ?? false,
    });

    return checklist;
  }

  /**
   * Update a checklist.
   */
  update(id: string, userId: string, input: UpdateChecklistInput): Checklist {
    this.getById(id);
    const checklist = this.repo.update(id, input as Partial<Checklist>);

    this.auditLog.log(userId, 'checklist', id, 'update', input as Record<string, unknown>);
    return checklist;
  }

  /**
   * Delete a checklist and all its items.
   */
  delete(id: string, userId: string): boolean {
    this.getById(id);
    const deleted = this.repo.delete(id);
    if (deleted) {
      this.auditLog.log(userId, 'checklist', id, 'delete');
    }
    return deleted;
  }

  /**
   * Create a new checklist from a template.
   */
  createFromTemplate(templateId: string, userId: string): ChecklistWithItems {
    const checklist = this.repo.createFromTemplate(templateId, userId);

    this.auditLog.log(userId, 'checklist', checklist.id, 'create', {
      fromTemplate: templateId,
    });

    return checklist;
  }

  // ─── Items ──────────────────────────────────────────────────────────────

  /**
   * Add an item to a checklist.
   */
  addItem(checklistId: string, userId: string, title: string, sortOrder?: number): ChecklistItem {
    this.getById(checklistId);
    const order = sortOrder ?? 0;
    const item = this.repo.addItem(checklistId, title, order);

    this.auditLog.log(userId, 'checklist_item', item.id, 'create', {
      checklistId,
      content: title,
    });

    return item;
  }

  /**
   * Update a checklist item.
   */
  updateItem(
    itemId: string,
    userId: string,
    data: Partial<Pick<ChecklistItem, 'content' | 'isCompleted' | 'sortOrder'>>
  ): ChecklistItem {
    const item = this.repo.updateItem(itemId, data);

    this.auditLog.log(userId, 'checklist_item', itemId, 'update', data as Record<string, unknown>);
    return item;
  }

  /**
   * Delete a checklist item.
   */
  deleteItem(itemId: string, userId: string): boolean {
    const deleted = this.repo.deleteItem(itemId);
    if (deleted) {
      this.auditLog.log(userId, 'checklist_item', itemId, 'delete');
    }
    return deleted;
  }

  /**
   * Reorder items within a checklist.
   */
  reorderItems(checklistId: string, userId: string, itemIds: string[]): void {
    this.getById(checklistId);
    this.repo.reorderItems(checklistId, itemIds);

    this.auditLog.log(userId, 'checklist', checklistId, 'update', {
      action: 'reorder_items',
    });
  }

  /**
   * Toggle the completion of a checklist item.
   */
  toggleItem(itemId: string, userId: string): ChecklistItem {
    const item = this.repo.toggleItem(itemId);

    this.auditLog.log(userId, 'checklist_item', itemId, 'update', {
      isCompleted: item.isCompleted,
    });

    return item;
  }

  /**
   * Calculate progress for a checklist.
   */
  getProgress(checklistId: string): ChecklistProgress {
    const checklist = this.getWithItems(checklistId);
    const total = checklist.items.length;
    const completed = checklist.items.filter((i) => i.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage };
  }
}
