import { AuditLogRepository, type FindAuditLogOptions } from '@/lib/repositories/audit-log.repository';
import type { AuditLogEntry, AuditAction } from '@/lib/types';

export interface PaginatedAuditLogs {
  data: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export class AuditLogService {
  private repo = new AuditLogRepository();

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
    return this.repo.log(userId, entityType, entityId, action, changes);
  }

  /**
   * Find audit logs for a specific entity.
   */
  findByEntity(entityType: string, entityId: string): AuditLogEntry[] {
    return this.repo.findByEntity(entityType, entityId);
  }

  /**
   * Find audit logs for a user with pagination and filtering.
   */
  findByUser(userId: string, options: FindAuditLogOptions = {}): PaginatedAuditLogs {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const data = this.repo.findByUser(userId, { ...options, limit, offset });
    const total = this.repo.countByUser(userId, {
      action: options.action,
      entityType: options.entityType,
      dateRange: options.dateRange,
    });

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }
}
