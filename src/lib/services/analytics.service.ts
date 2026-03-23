import { getDb } from '@/lib/db';
import { TaskRepository } from '@/lib/repositories/task.repository';
import { TimeEntryRepository } from '@/lib/repositories/time-entry.repository';
import { MentalHealthRepository } from '@/lib/repositories/mental-health.repository';
import { ProjectRepository } from '@/lib/repositories/project.repository';
import type { DateRange } from '@/lib/types';
import type Database from 'better-sqlite3';

export interface ProductivitySummary {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalProjects: number;
  activeProjects: number;
  totalTrackedMinutes: number;
  averageMood: number;
  averageEnergy: number;
  averageStress: number;
}

export interface ProductivityScore {
  date: string;
  tasksCompleted: number;
  timeTrackedMinutes: number;
  score: number;
}

export interface TimeDistribution {
  taskId: string | null;
  taskTitle: string | null;
  totalMinutes: number;
  percentage: number;
}

export interface TaskCompletionRate {
  period: string;
  total: number;
  completed: number;
  rate: number;
}

export interface MentalHealthTrend {
  date: string;
  avgMood: number;
  avgEnergy: number;
  avgStress: number;
}

export interface MentalHealthTrendData {
  avgMood: number;
  avgEnergy: number;
  avgStress: number;
  count: number;
}

export interface ProductivityData {
  tasksCompleted: number;
  tasksCreated: number;
  totalTrackedMinutes: number;
  averageDailyMinutes: number;
  byTask: { taskId: string | null; taskTitle: string | null; totalMinutes: number }[];
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  tasksCompleted: number;
  tasksCreated: number;
  totalTimeMinutes: number;
  avgMood: number | null;
  avgEnergy: number | null;
  avgStress: number | null;
  productivityScore: number;
}

export class AnalyticsService {
  private taskRepo = new TaskRepository();
  private timeRepo = new TimeEntryRepository();
  private mentalHealthRepo = new MentalHealthRepository();
  private projectRepo = new ProjectRepository();

  private get db(): Database.Database {
    return getDb();
  }

  /**
   * High-level productivity summary for a user (last 30 days).
   */
  getSummary(userId: string): ProductivitySummary {
    const allTasks = this.taskRepo.findByUserId(userId);
    const completedTasks = allTasks.filter((t) => t.status === 'done').length;
    const overdueTasks = this.taskRepo.findOverdue(userId).length;

    const allProjects = this.projectRepo.findByUserId(userId, { includeArchived: true });
    const activeProjects = allProjects.filter((p) => p.status === 'active').length;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const totalTrackedMinutes = this.timeRepo.getTotalDuration(
      userId,
      thirtyDaysAgo.toISOString(),
      now.toISOString()
    );

    const averages = this.mentalHealthRepo.getAverages(userId, {
      start: thirtyDaysAgo.toISOString(),
      end: now.toISOString(),
    });

    return {
      totalTasks: allTasks.length,
      completedTasks,
      overdueTasks,
      totalProjects: allProjects.length,
      activeProjects,
      totalTrackedMinutes,
      averageMood: averages.avgMood,
      averageEnergy: averages.avgEnergy,
      averageStress: averages.avgStress,
    };
  }

  /**
   * Detailed productivity data for a date range.
   */
  getProductivity(userId: string, dateRange: DateRange): ProductivityData {
    const allTasks = this.taskRepo.findByUserId(userId);
    const start = new Date(dateRange.start).getTime();
    const end = new Date(dateRange.end).getTime();

    const tasksCreated = allTasks.filter((t) => {
      const created = new Date(t.createdAt).getTime();
      return created >= start && created <= end;
    }).length;

    const tasksCompleted = allTasks.filter((t) => {
      if (!t.completedAt) return false;
      const completed = new Date(t.completedAt).getTime();
      return completed >= start && completed <= end;
    }).length;

    const totalTrackedMinutes = this.timeRepo.getTotalDuration(
      userId,
      dateRange.start,
      dateRange.end
    );

    const byTask = this.timeRepo.getDurationByTask(userId, dateRange.start, dateRange.end);

    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const averageDailyMinutes = Math.round(totalTrackedMinutes / days);

    return {
      tasksCompleted,
      tasksCreated,
      totalTrackedMinutes,
      averageDailyMinutes,
      byTask,
    };
  }

  /**
   * Calculate daily productivity scores for a user.
   * Score = min(100, tasksCompleted * 20 + timeTrackedMinutes / 6).
   */
  getProductivityScores(userId: string, startDate: string, endDate: string): ProductivityScore[] {
    // Get tasks completed by day
    const taskRows = this.db
      .prepare(
        `SELECT DATE(completed_at) AS date, COUNT(*) AS cnt
         FROM tasks
         WHERE user_id = ? AND status = 'done' AND completed_at IS NOT NULL
           AND DATE(completed_at) >= DATE(?) AND DATE(completed_at) <= DATE(?)
         GROUP BY DATE(completed_at)`
      )
      .all(userId, startDate, endDate) as Array<{ date: string; cnt: number }>;

    const tasksByDate = new Map(taskRows.map((r) => [r.date, r.cnt]));

    // Get time tracked by day
    const timeRows = this.db
      .prepare(
        `SELECT DATE(start_time) AS date, COALESCE(SUM(duration_minutes), 0) AS mins
         FROM time_entries
         WHERE user_id = ? AND duration_minutes IS NOT NULL
           AND DATE(start_time) >= DATE(?) AND DATE(start_time) <= DATE(?)
         GROUP BY DATE(start_time)`
      )
      .all(userId, startDate, endDate) as Array<{ date: string; mins: number }>;

    const timeByDate = new Map(timeRows.map((r) => [r.date, r.mins]));

    // Collect all dates
    const allDates = new Set([...Array.from(tasksByDate.keys()), ...Array.from(timeByDate.keys())]);
    const results: ProductivityScore[] = [];

    for (const date of Array.from(allDates).sort()) {
      const tasksCompleted = tasksByDate.get(date) ?? 0;
      const timeTrackedMinutes = timeByDate.get(date) ?? 0;
      const rawScore = tasksCompleted * 20 + timeTrackedMinutes / 6;
      results.push({
        date,
        tasksCompleted,
        timeTrackedMinutes,
        score: Math.min(100, Math.round(rawScore)),
      });
    }

    return results;
  }

  /**
   * Get time distribution across tasks for a date range.
   */
  getTimeDistribution(userId: string, startDate: string, endDate: string): TimeDistribution[] {
    const sql = `
      SELECT
        te.task_id,
        t.title AS task_title,
        COALESCE(SUM(te.duration_minutes), 0) AS total_minutes
      FROM time_entries te
      LEFT JOIN tasks t ON t.id = te.task_id
      WHERE te.user_id = ?
        AND te.start_time >= ?
        AND te.start_time <= ?
        AND te.duration_minutes IS NOT NULL
      GROUP BY te.task_id
      ORDER BY total_minutes DESC
    `;

    const rows = this.db.prepare(sql).all(userId, startDate, endDate) as Array<{
      task_id: string | null;
      task_title: string | null;
      total_minutes: number;
    }>;

    const grandTotal = rows.reduce((sum, r) => sum + r.total_minutes, 0);

    return rows.map((row) => ({
      taskId: row.task_id,
      taskTitle: row.task_title,
      totalMinutes: row.total_minutes,
      percentage: grandTotal > 0 ? Math.round((row.total_minutes / grandTotal) * 100) : 0,
    }));
  }

  /**
   * Get task completion rates grouped by week.
   */
  getTaskCompletionRates(userId: string, startDate: string, endDate: string): TaskCompletionRate[] {
    const sql = `
      SELECT
        strftime('%Y-W%W', created_at) AS period,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS completed
      FROM tasks
      WHERE user_id = ?
        AND created_at >= ?
        AND created_at <= ?
      GROUP BY period
      ORDER BY period ASC
    `;

    const rows = this.db.prepare(sql).all(userId, startDate, endDate) as Array<{
      period: string;
      total: number;
      completed: number;
    }>;

    return rows.map((row) => ({
      period: row.period,
      total: row.total,
      completed: row.completed,
      rate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
    }));
  }

  /**
   * Mental health trends as daily data points.
   */
  getMentalHealthTrends(userId: string, dateRange: DateRange): MentalHealthTrendData;
  getMentalHealthTrends(userId: string, startDate: string, endDate: string): MentalHealthTrend[];
  getMentalHealthTrends(
    userId: string,
    startDateOrRange: string | DateRange,
    endDate?: string
  ): MentalHealthTrendData | MentalHealthTrend[] {
    // Overload: DateRange object
    if (typeof startDateOrRange === 'object') {
      return this.mentalHealthRepo.getAverages(userId, startDateOrRange);
    }

    // Overload: individual start/end dates - return daily trends
    const sql = `
      SELECT
        date,
        mood_rating AS avg_mood,
        energy_level AS avg_energy,
        stress_level AS avg_stress
      FROM mental_health_check_ins
      WHERE user_id = ?
        AND date >= ?
        AND date <= ?
      ORDER BY date ASC
    `;

    const rows = this.db.prepare(sql).all(userId, startDateOrRange, endDate!) as Array<{
      date: string;
      avg_mood: number;
      avg_energy: number;
      avg_stress: number;
    }>;

    return rows.map((row) => ({
      date: row.date,
      avgMood: row.avg_mood,
      avgEnergy: row.avg_energy,
      avgStress: row.avg_stress,
    }));
  }

  /**
   * Generate a weekly summary combining tasks, time tracking, and mental health.
   */
  getWeeklySummary(userId: string, weekStartDate: string): WeeklySummary {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endDateStr = end.toISOString();

    const taskRow = this.db
      .prepare(
        `SELECT
          COUNT(CASE WHEN status = 'done' AND completed_at >= ? AND completed_at <= ? THEN 1 END) AS completed,
          COUNT(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 END) AS created
        FROM tasks
        WHERE user_id = ?`
      )
      .get(weekStartDate, endDateStr, weekStartDate, endDateStr, userId) as {
        completed: number;
        created: number;
      };

    const timeRow = this.db
      .prepare(
        `SELECT COALESCE(SUM(duration_minutes), 0) AS total
        FROM time_entries
        WHERE user_id = ? AND start_time >= ? AND start_time <= ? AND duration_minutes IS NOT NULL`
      )
      .get(userId, weekStartDate, endDateStr) as { total: number };

    const mhRow = this.db
      .prepare(
        `SELECT
          AVG(mood_rating) AS avg_mood,
          AVG(energy_level) AS avg_energy,
          AVG(stress_level) AS avg_stress
        FROM mental_health_check_ins
        WHERE user_id = ? AND date >= ? AND date <= ?`
      )
      .get(userId, weekStartDate, endDateStr) as {
        avg_mood: number | null;
        avg_energy: number | null;
        avg_stress: number | null;
      };

    const rawScore = taskRow.completed * 20 + timeRow.total / 6;

    return {
      weekStart: weekStartDate,
      weekEnd: endDateStr,
      tasksCompleted: taskRow.completed,
      tasksCreated: taskRow.created,
      totalTimeMinutes: timeRow.total,
      avgMood: mhRow.avg_mood ? Math.round(mhRow.avg_mood * 100) / 100 : null,
      avgEnergy: mhRow.avg_energy ? Math.round(mhRow.avg_energy * 100) / 100 : null,
      avgStress: mhRow.avg_stress ? Math.round(mhRow.avg_stress * 100) / 100 : null,
      productivityScore: Math.min(100, Math.round(rawScore)),
    };
  }
}
