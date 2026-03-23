import { ReminderRepository, type FindRemindersOptions } from '@/lib/repositories/reminder.repository';
import { AuditLogRepository } from '@/lib/repositories/audit-log.repository';
import { NotFoundError } from '@/lib/utils/errors';
import type { Reminder, ReminderFrequency } from '@/lib/types';

export interface CreateReminderInput {
  userId: string;
  taskId?: string | null;
  title: string;
  description?: string | null;
  remindAt: string;
  frequency?: ReminderFrequency;
}

export interface UpdateReminderInput {
  title?: string;
  description?: string | null;
  remindAt?: string;
  frequency?: ReminderFrequency;
  isActive?: boolean;
}

export class ReminderService {
  private repo = new ReminderRepository();
  private auditLog = new AuditLogRepository();

  /**
   * Get a reminder by id. Throws if not found.
   */
  getById(id: string): Reminder {
    const reminder = this.repo.findById(id);
    if (!reminder) throw new NotFoundError('Reminder', id);
    return reminder;
  }

  /**
   * List reminders for a user.
   */
  listByUser(userId: string, options?: FindRemindersOptions): Reminder[] {
    return this.repo.findByUserId(userId, options);
  }

  /**
   * Find reminders that are currently due.
   */
  findDue(userId: string): Reminder[] {
    return this.repo.findDue(userId);
  }

  /**
   * Create a new reminder.
   */
  create(input: CreateReminderInput): Reminder {
    const reminder = this.repo.create({
      userId: input.userId,
      taskId: input.taskId ?? null,
      title: input.title,
      description: input.description ?? null,
      remindAt: input.remindAt,
      frequency: input.frequency ?? 'once',
      isActive: true,
      lastTriggeredAt: null,
      metadata: {},
    } as Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'reminder', reminder.id, 'create', {
      title: reminder.title,
      remindAt: reminder.remindAt,
    });

    return reminder;
  }

  /**
   * Update a reminder.
   */
  update(id: string, userId: string, input: UpdateReminderInput): Reminder {
    this.getById(id);
    const reminder = this.repo.update(id, input as Partial<Reminder>);

    this.auditLog.log(userId, 'reminder', id, 'update', input as Record<string, unknown>);
    return reminder;
  }

  /**
   * Delete a reminder.
   */
  delete(id: string, userId: string): boolean {
    this.getById(id);
    const deleted = this.repo.delete(id);
    if (deleted) {
      this.auditLog.log(userId, 'reminder', id, 'delete');
    }
    return deleted;
  }

  /**
   * Dismiss a reminder.
   */
  dismiss(id: string, userId: string): Reminder {
    this.getById(id);
    const reminder = this.repo.dismiss(id);

    this.auditLog.log(userId, 'reminder', id, 'update', {
      action: 'dismiss',
    });

    return reminder;
  }
}
