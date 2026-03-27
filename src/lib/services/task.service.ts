import { TaskRepository, type FindTasksOptions } from '@/lib/repositories/task.repository';
import { AuditLogRepository } from '@/lib/repositories/audit-log.repository';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/utils/errors';
import { getNow } from '@/lib/utils/dates';
import type { Task, TaskStatus, TaskPriority, TaskDependency, AuditAction } from '@/lib/types';

/** Valid status transitions to prevent invalid state changes. */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['todo', 'in_progress', 'done', 'cancelled'],
  todo: ['in_progress', 'in_review', 'done', 'cancelled'],
  in_progress: ['in_review', 'done', 'todo', 'backlog', 'cancelled'],
  in_review: ['done', 'in_progress', 'todo', 'cancelled'],
  done: ['todo', 'in_progress', 'backlog'],
  cancelled: ['todo', 'backlog', 'in_progress'],
};

export interface CreateTaskInput {
  userId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  projectId?: string | null;
  sortOrder?: number;
  tags?: string[];
}

export class TaskService {
  private repo = new TaskRepository();
  private auditLog = new AuditLogRepository();

  /**
   * Get a task by id. Throws if not found.
   */
  getById(id: string): Task {
    const task = this.repo.findById(id);
    if (!task) throw new NotFoundError('Task', id);
    return task;
  }

  /**
   * List tasks for a user with optional filters.
   */
  listByUser(userId: string, options?: FindTasksOptions): Task[] {
    return this.repo.findByUserId(userId, options);
  }

  /**
   * List tasks in a project.
   */
  listByProject(projectId: string): Task[] {
    return this.repo.findByProjectId(projectId);
  }

  /**
   * Find overdue tasks for a user.
   */
  findOverdue(userId: string): Task[] {
    return this.repo.findOverdue(userId);
  }

  /**
   * Find upcoming tasks within the given number of days.
   */
  findUpcoming(userId: string, days: number = 7): Task[] {
    return this.repo.findUpcoming(userId, days);
  }

  /**
   * Create a new task.
   */
  create(input: CreateTaskInput): Task {
    const task = this.repo.create({
      userId: input.userId,
      projectId: input.projectId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      actualMinutes: null,
      tags: input.tags ?? [],
      sortOrder: 0,
      completedAt: null,
      metadata: {},
    } as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'task', task.id, 'create', {
      title: task.title,
      status: task.status,
    });

    return task;
  }

  /**
   * Update a task with status transition validation.
   */
  update(id: string, userId: string, input: UpdateTaskInput): Task {
    const existing = this.getById(id);

    // Validate status transition if status is being changed
    if (input.status && input.status !== existing.status) {
      this.validateStatusTransition(existing.status, input.status);

      // Check that all dependencies are completed before moving to done
      if (input.status === 'done') {
        this.validateDependenciesComplete(id);
      }
    }

    // Automatically set completedAt when moving to 'done'
    const updateData: Record<string, unknown> = { ...input };
    if (input.status === 'done' && existing.status !== 'done') {
      updateData.completedAt = getNow();
    } else if (input.status && input.status !== 'done' && existing.completedAt) {
      updateData.completedAt = null;
    }

    const task = this.repo.update(id, updateData as Partial<Task>);

    // Build changes for audit
    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if ((existing as unknown as Record<string, unknown>)[key] !== value) {
        changes[key] = { from: (existing as unknown as Record<string, unknown>)[key], to: value };
      }
    }

    const action: AuditAction = input.status === 'done' && existing.status !== 'done' ? 'complete' : 'update';
    // Always include the task title so the audit log can show the entity name
    this.auditLog.log(userId, 'task', id, action, { _name: existing.title, ...changes });

    return task;
  }

  /**
   * Delete a task.
   */
  delete(id: string, userId: string): boolean {
    this.getById(id);
    const deleted = this.repo.delete(id);
    if (deleted) {
      this.auditLog.log(userId, 'task', id, 'delete');
    }
    return deleted;
  }

  /**
   * Get dependencies for a task.
   */
  getDependencies(taskId: string): TaskDependency[] {
    return this.repo.getDependencies(taskId);
  }

  /**
   * Add a dependency. Validates no circular dependency.
   */
  addDependency(taskId: string, dependsOnId: string, userId: string): TaskDependency {
    if (taskId === dependsOnId) {
      throw new ValidationError('A task cannot depend on itself');
    }

    // Check for circular dependency
    if (this.wouldCreateCycle(taskId, dependsOnId)) {
      throw new ConflictError('Adding this dependency would create a circular reference');
    }

    const dep = this.repo.addDependency(taskId, dependsOnId);
    this.auditLog.log(userId, 'task', taskId, 'update', {
      dependency: { added: dependsOnId },
    });
    return dep;
  }

  /**
   * Remove a dependency.
   */
  removeDependency(taskId: string, dependsOnId: string, userId: string): boolean {
    const removed = this.repo.removeDependency(taskId, dependsOnId);
    if (removed) {
      this.auditLog.log(userId, 'task', taskId, 'update', {
        dependency: { removed: dependsOnId },
      });
    }
    return removed;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  private validateStatusTransition(from: TaskStatus, to: TaskStatus): void {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new ValidationError(
        `Invalid status transition from '${from}' to '${to}'`,
        { status: [`Cannot transition from '${from}' to '${to}'`] }
      );
    }
  }

  private validateDependenciesComplete(taskId: string): void {
    const deps = this.repo.getDependencies(taskId);
    for (const dep of deps) {
      const depTask = this.repo.findById(dep.dependsOnTaskId);
      if (depTask && depTask.status !== 'done') {
        throw new ValidationError(
          `Dependency '${depTask.title}' must be completed first`,
          { dependencies: [`Task '${dep.dependsOnTaskId}' is not yet complete`] }
        );
      }
    }
  }

  private wouldCreateCycle(taskId: string, dependsOnId: string): boolean {
    // BFS from dependsOnId to see if we can reach taskId
    const visited = new Set<string>();
    const queue = [dependsOnId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === taskId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const deps = this.repo.getDependencies(current);
      for (const dep of deps) {
        queue.push(dep.dependsOnTaskId);
      }
    }

    return false;
  }
}
