import { BaseRepository } from './base.repository';
import type { Task, TaskDependency } from '@/lib/types';
import { getNow, addDays } from '@/lib/utils/dates';
import { generateId } from '@/lib/utils/id';

export interface FindTasksOptions {
  status?: string;
  priority?: string;
  projectId?: string;
  search?: string;
  dueDate?: string;
}

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super('tasks');
  }

  /**
   * Find tasks for a user with optional filters.
   */
  findByUserId(userId: string, options: FindTasksOptions = {}): Task[] {
    const { status, priority, projectId, search, dueDate } = options;
    const clauses: string[] = ['t.user_id = ?'];
    const params: unknown[] = [userId];

    if (status) {
      clauses.push('t.status = ?');
      params.push(status);
    }

    if (priority) {
      clauses.push('t.priority = ?');
      params.push(priority);
    }

    if (projectId) {
      clauses.push('t.project_id = ?');
      params.push(projectId);
    }

    if (search) {
      clauses.push('(t.title LIKE ? OR t.description LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    if (dueDate) {
      clauses.push('DATE(t.due_date) = DATE(?)');
      params.push(dueDate);
    }

    const sql = `
      SELECT t.*
      FROM tasks t
      WHERE ${clauses.join(' AND ')}
      ORDER BY t.sort_order ASC, t.created_at DESC
    `;

    return this.query<Task>(sql, params);
  }

  /**
   * Find all tasks in a given project.
   */
  findByProjectId(projectId: string): Task[] {
    const sql = `
      SELECT * FROM tasks
      WHERE project_id = ?
      ORDER BY sort_order ASC, created_at DESC
    `;
    return this.query<Task>(sql, [projectId]);
  }

  /**
   * Find all overdue tasks for a user (past due_date, not done/cancelled).
   */
  findOverdue(userId: string): Task[] {
    const now = getNow();
    const sql = `
      SELECT * FROM tasks
      WHERE user_id = ?
        AND due_date IS NOT NULL
        AND due_date < ?
        AND status NOT IN ('done', 'cancelled')
      ORDER BY due_date ASC
    `;
    return this.query<Task>(sql, [userId, now]);
  }

  /**
   * Find upcoming tasks due within the given number of days.
   */
  findUpcoming(userId: string, days: number): Task[] {
    const now = getNow();
    const future = addDays(now, days);
    const sql = `
      SELECT * FROM tasks
      WHERE user_id = ?
        AND due_date IS NOT NULL
        AND due_date >= ?
        AND due_date <= ?
        AND status NOT IN ('done', 'cancelled')
      ORDER BY due_date ASC
    `;
    return this.query<Task>(sql, [userId, now, future]);
  }

  /**
   * Get all dependencies for a task.
   */
  getDependencies(taskId: string): TaskDependency[] {
    const sql = `
      SELECT * FROM task_dependencies
      WHERE task_id = ?
    `;
    return this.query<TaskDependency>(sql, [taskId]);
  }

  /**
   * Add a dependency: taskId depends on dependsOnId.
   */
  addDependency(taskId: string, dependsOnId: string): TaskDependency {
    const now = getNow();
    const id = generateId();
    this.execute(
      `INSERT INTO task_dependencies (id, task_id, depends_on_task_id, created_at) VALUES (?, ?, ?, ?)`,
      [id, taskId, dependsOnId, now]
    );
    const dep = this.queryOne<TaskDependency>(
      `SELECT * FROM task_dependencies WHERE id = ?`,
      [id]
    );
    return dep as TaskDependency;
  }

  /**
   * Remove a dependency relationship.
   */
  removeDependency(taskId: string, dependsOnId: string): boolean {
    const result = this.execute(
      `DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?`,
      [taskId, dependsOnId]
    );
    return result.changes > 0;
  }
}
