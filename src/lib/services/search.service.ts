import { getDb } from '@/lib/db';
import { TaskRepository } from '@/lib/repositories/task.repository';
import { ProjectRepository } from '@/lib/repositories/project.repository';
import { ChecklistRepository } from '@/lib/repositories/checklist.repository';
import { MentalHealthRepository } from '@/lib/repositories/mental-health.repository';
import type Database from 'better-sqlite3';

export interface SearchResult {
  type: 'project' | 'task' | 'checklist' | 'journal_entry';
  id: string;
  title: string;
  snippet: string;
  matchedField: string;
  createdAt: string;
}

export interface SearchResults {
  results: SearchResult[];
  total: number;
  query: string;
}

export interface SearchOptions {
  types?: Array<'project' | 'task' | 'journal_entry'>;
  limit?: number;
  offset?: number;
}

export class SearchService {
  private taskRepo = new TaskRepository();
  private projectRepo = new ProjectRepository();
  private checklistRepo = new ChecklistRepository();
  private mentalHealthRepo = new MentalHealthRepository();

  private get db(): Database.Database {
    return getDb();
  }

  /**
   * Full-text search across projects, tasks, checklists, and journal entries.
   * Uses LIKE queries with parameterized values for SQL injection safety.
   */
  search(userId: string, query: string, options: SearchOptions = {}): SearchResults {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0, query };
    }

    const { limit = 20, offset = 0 } = options;
    const results: SearchResult[] = [];

    // Search projects
    const projects = this.projectRepo.findByUserId(userId, {
      search: query,
      includeArchived: true,
    });
    for (const project of projects) {
      const nameMatch = project.name.toLowerCase().includes(query.toLowerCase());
      results.push({
        type: 'project',
        id: project.id,
        title: project.name,
        snippet: this.createSnippet(
          nameMatch ? project.name : (project.description ?? ''),
          query
        ),
        matchedField: nameMatch ? 'name' : 'description',
        createdAt: project.createdAt,
      });
    }

    // Search tasks
    const tasks = this.taskRepo.findByUserId(userId, { search: query });
    for (const task of tasks) {
      const titleMatch = task.title.toLowerCase().includes(query.toLowerCase());
      results.push({
        type: 'task',
        id: task.id,
        title: task.title,
        snippet: this.createSnippet(
          titleMatch ? task.title : (task.description ?? ''),
          query
        ),
        matchedField: titleMatch ? 'title' : 'description',
        createdAt: task.createdAt,
      });
    }

    // Search checklists
    const checklists = this.checklistRepo.findByUserId(userId);
    const lowerQuery = query.toLowerCase();
    for (const checklist of checklists) {
      if (
        checklist.title.toLowerCase().includes(lowerQuery) ||
        (checklist.description && checklist.description.toLowerCase().includes(lowerQuery))
      ) {
        const titleMatch = checklist.title.toLowerCase().includes(lowerQuery);
        results.push({
          type: 'checklist',
          id: checklist.id,
          title: checklist.title,
          snippet: this.createSnippet(
            titleMatch ? checklist.title : (checklist.description ?? ''),
            query
          ),
          matchedField: titleMatch ? 'title' : 'description',
          createdAt: checklist.createdAt,
        });
      }
    }

    // Search journal entries
    const journalEntries = this.mentalHealthRepo.findJournalEntries(userId, { search: query });
    for (const entry of journalEntries) {
      const titleMatch = entry.title?.toLowerCase().includes(lowerQuery);
      results.push({
        type: 'journal_entry',
        id: entry.id,
        title: entry.title ?? 'Untitled Journal Entry',
        snippet: this.createSnippet(
          titleMatch ? (entry.title ?? '') : entry.content,
          query
        ),
        matchedField: titleMatch ? 'title' : 'content',
        createdAt: entry.createdAt,
      });
    }

    // Sort: title/name matches first, then by recency
    results.sort((a, b) => {
      const aPrimary = a.matchedField === 'title' || a.matchedField === 'name' ? 0 : 1;
      const bPrimary = b.matchedField === 'title' || b.matchedField === 'name' ? 0 : 1;
      if (aPrimary !== bPrimary) return aPrimary - bPrimary;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total,
      query,
    };
  }

  /**
   * Create a short snippet around the matched text.
   */
  private createSnippet(text: string, query: string): string {
    if (!text) return '';

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return text.substring(0, 150);
    }

    const snippetStart = Math.max(0, index - 50);
    const snippetEnd = Math.min(text.length, index + query.length + 50);
    let snippet = text.substring(snippetStart, snippetEnd);

    if (snippetStart > 0) snippet = '...' + snippet;
    if (snippetEnd < text.length) snippet = snippet + '...';

    return snippet;
  }
}
