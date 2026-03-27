import { ProjectRepository, type FindProjectsOptions, type ProjectWithTaskCount } from '@/lib/repositories/project.repository';
import { AuditLogRepository } from '@/lib/repositories/audit-log.repository';
import { NotFoundError } from '@/lib/utils/errors';
import type { Project, ProjectStatus } from '@/lib/types';

export interface CreateProjectInput {
  userId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status?: ProjectStatus;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  status?: ProjectStatus;
  sortOrder?: number;
}

export class ProjectService {
  private repo = new ProjectRepository();
  private auditLog = new AuditLogRepository();

  /**
   * Get a project by id. Throws if not found.
   */
  getById(id: string): Project {
    const project = this.repo.findById(id);
    if (!project) throw new NotFoundError('Project', id);
    return project;
  }

  /**
   * Get a project with its task count stats.
   */
  getWithTaskCount(id: string): ProjectWithTaskCount {
    const project = this.repo.getWithTaskCount(id);
    if (!project) throw new NotFoundError('Project', id);
    return project;
  }

  /**
   * List projects for a user.
   */
  listByUser(userId: string, options?: FindProjectsOptions): Project[] {
    return this.repo.findByUserId(userId, options);
  }

  /**
   * List projects for a user with task counts included.
   */
  listByUserWithTaskCounts(userId: string, options?: FindProjectsOptions): ProjectWithTaskCount[] {
    return this.repo.findByUserIdWithTaskCounts(userId, options);
  }

  /**
   * Create a new project.
   */
  create(input: CreateProjectInput): Project {
    const project = this.repo.create({
      userId: input.userId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      status: input.status ?? 'active',
      sortOrder: 0,
      metadata: {},
    } as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'project', project.id, 'create', {
      name: project.name,
    });

    return project;
  }

  /**
   * Update a project.
   */
  update(id: string, userId: string, input: UpdateProjectInput): Project {
    const existing = this.getById(id);
    const project = this.repo.update(id, input as Partial<Project>);

    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if ((existing as unknown as Record<string, unknown>)[key] !== value) {
        changes[key] = { from: (existing as unknown as Record<string, unknown>)[key], to: value };
      }
    }

    this.auditLog.log(userId, 'project', id, 'update', changes);
    return project;
  }

  /**
   * Delete a project.
   */
  delete(id: string, userId: string): boolean {
    this.getById(id); // ensure it exists
    const deleted = this.repo.delete(id);
    if (deleted) {
      this.auditLog.log(userId, 'project', id, 'delete');
    }
    return deleted;
  }

  /**
   * Archive a project.
   */
  archive(id: string, userId: string): Project {
    this.getById(id);
    const project = this.repo.archive(id);
    this.auditLog.log(userId, 'project', id, 'archive');
    return project;
  }

  /**
   * Unarchive a project.
   */
  unarchive(id: string, userId: string): Project {
    this.getById(id);
    const project = this.repo.unarchive(id);
    this.auditLog.log(userId, 'project', id, 'restore');
    return project;
  }
}
