import { NoteRepository, type FindNotesOptions } from '@/lib/repositories/note.repository';
import { AuditLogRepository } from '@/lib/repositories/audit-log.repository';
import { NotFoundError } from '@/lib/utils/errors';
import type { Note } from '@/lib/types';

export interface CreateNoteServiceInput {
  userId: string;
  title: string;
  content?: string;
  isPinned?: boolean;
  tags?: string[];
}

export interface UpdateNoteServiceInput {
  title?: string;
  content?: string;
  isPinned?: boolean;
  tags?: string[];
}

export class NoteService {
  private repo = new NoteRepository();
  private auditLog = new AuditLogRepository();

  list(userId: string, options?: FindNotesOptions): Note[] {
    return this.repo.findByUserId(userId, options);
  }

  getById(id: string): Note {
    const note = this.repo.findById(id);
    if (!note) throw new NotFoundError('Note', id);
    return note;
  }

  create(input: CreateNoteServiceInput): Note {
    const note = this.repo.create({
      userId: input.userId,
      title: input.title,
      content: input.content ?? '',
      isPinned: input.isPinned ?? false,
      tags: input.tags ?? [],
      metadata: {},
    } as Omit<Note, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'note', note.id, 'create', { title: note.title });
    return note;
  }

  update(id: string, userId: string, input: UpdateNoteServiceInput): Note {
    this.getById(id);
    const note = this.repo.update(id, input as Partial<Note>);
    this.auditLog.log(userId, 'note', id, 'update', input);
    return note;
  }

  delete(id: string, userId: string): boolean {
    this.getById(id);
    const deleted = this.repo.delete(id);
    if (deleted) {
      this.auditLog.log(userId, 'note', id, 'delete');
    }
    return deleted;
  }

  togglePin(id: string, userId: string): Note {
    const note = this.getById(id);
    return this.update(id, userId, { isPinned: !note.isPinned });
  }
}
