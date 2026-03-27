import { BaseRepository } from './base.repository';
import type { Subtask, TaskComment } from '@/lib/types';

export class SubtaskRepository extends BaseRepository<Subtask> {
  constructor() {
    super('subtasks');
  }

  findByTaskId(taskId: string): Subtask[] {
    return this.query<Subtask>(
      'SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, created_at ASC',
      [taskId]
    );
  }
}

export class TaskCommentRepository extends BaseRepository<TaskComment> {
  constructor() {
    super('task_comments');
  }

  findByTaskId(taskId: string): TaskComment[] {
    return this.query<TaskComment>(
      'SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC',
      [taskId]
    );
  }
}
