import { ResumeRepository } from '@/lib/repositories/resume.repository';
import { JobListingRepository, type FindJobListingsOptions } from '@/lib/repositories/job-listing.repository';
import { ApplicationRepository, type FindApplicationsOptions } from '@/lib/repositories/application.repository';
import { ColdEmailRepository, type FindColdEmailsOptions } from '@/lib/repositories/cold-email.repository';
import { LinkedInOutreachRepository, type FindLinkedInOutreachesOptions } from '@/lib/repositories/linkedin-outreach.repository';
import { SearchSessionRepository } from '@/lib/repositories/search-session.repository';
import { AuditLogRepository } from '@/lib/repositories/audit-log.repository';
import { NotFoundError } from '@/lib/utils/errors';
import type { Resume, JobListing, Application, ColdEmail, LinkedInOutreach, SearchSession } from '@/lib/types';

// ─── Service Inputs ─────────────────────────────────────────────────────────

export interface CreateResumeInput {
  userId: string;
  fileName: string;
  filePath: string;
  rawText: string;
  parsedData: Record<string, unknown>;
  skills: string[];
  experience: Record<string, unknown>[];
  education: Record<string, unknown>[];
}

export interface CreateJobListingInput {
  userId: string;
  title: string;
  company: string;
  location?: string;
  salaryRange?: string | null;
  jobType?: string | null;
  url?: string | null;
  description?: string;
  requirements?: string[];
  score?: number | null;
  scoreReasons?: string[];
  source?: string | null;
  status?: string;
  tags?: string[];
}

export interface CreateApplicationInput {
  userId: string;
  listingId: string;
  resumeVersion?: string | null;
  coverLetter?: string | null;
  appliedVia?: string;
  appliedAt?: string | null;
  status?: string;
  notes?: string | null;
  followUpDate?: string | null;
}

export interface CreateColdEmailInput {
  userId: string;
  listingId?: string | null;
  recipientName: string;
  recipientEmail: string;
  recipientTitle?: string | null;
  company: string;
  subject: string;
  body: string;
  status?: string;
}

export interface CreateLinkedInOutreachInput {
  userId: string;
  listingId?: string | null;
  personName: string;
  personTitle?: string | null;
  personUrl?: string | null;
  company: string;
  message: string;
  status?: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export interface CreateSearchSessionInput {
  userId: string;
  query: string;
  location?: string;
  siteFilter?: string;
  dateFilter?: string | null;
  totalResults?: number;
  nextStart?: number;
}

export class JobHuntService {
  private resumeRepo = new ResumeRepository();
  private listingRepo = new JobListingRepository();
  private applicationRepo = new ApplicationRepository();
  private emailRepo = new ColdEmailRepository();
  private outreachRepo = new LinkedInOutreachRepository();
  private searchSessionRepo = new SearchSessionRepository();
  private auditLog = new AuditLogRepository();

  // ── Resumes ──────────────────────────────────────────────────────────────

  getResume(userId: string): Resume | undefined {
    return this.resumeRepo.findByUserId(userId);
  }

  getResumeById(id: string): Resume {
    const resume = this.resumeRepo.findById(id);
    if (!resume) throw new NotFoundError('Resume', id);
    return resume;
  }

  createResume(input: CreateResumeInput): Resume {
    const resume = this.resumeRepo.create({
      userId: input.userId,
      fileName: input.fileName,
      filePath: input.filePath,
      rawText: input.rawText,
      parsedData: input.parsedData,
      skills: input.skills,
      experience: input.experience,
      education: input.education,
    } as Omit<Resume, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'resume', resume.id, 'create', { fileName: input.fileName });
    return resume;
  }

  updateResume(id: string, userId: string, input: Partial<Resume>): Resume {
    this.getResumeById(id);
    const resume = this.resumeRepo.update(id, input);
    this.auditLog.log(userId, 'resume', id, 'update', {});
    return resume;
  }

  deleteResume(id: string, userId: string): boolean {
    this.getResumeById(id);
    const deleted = this.resumeRepo.delete(id);
    if (deleted) this.auditLog.log(userId, 'resume', id, 'delete');
    return deleted;
  }

  // ── Job Listings ─────────────────────────────────────────────────────────

  listJobs(userId: string, options?: FindJobListingsOptions): JobListing[] {
    return this.listingRepo.findByUserId(userId, options);
  }

  getJob(id: string, userId?: string): JobListing {
    const job = this.listingRepo.findById(id);
    if (!job) throw new NotFoundError('JobListing', id);
    if (userId && job.userId !== userId) throw new NotFoundError('JobListing', id);
    return job;
  }

  createJob(input: CreateJobListingInput): JobListing {
    const job = this.listingRepo.create({
      userId: input.userId,
      title: input.title,
      company: input.company,
      location: input.location ?? '',
      salaryRange: input.salaryRange ?? null,
      jobType: input.jobType ?? null,
      url: input.url ?? null,
      description: input.description ?? '',
      requirements: input.requirements ?? [],
      score: input.score ?? null,
      scoreReasons: input.scoreReasons ?? [],
      source: input.source ?? null,
      status: input.status ?? 'saved',
      tags: input.tags ?? [],
      metadata: {},
      appliedAt: null,
    } as Omit<JobListing, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'job_listing', job.id, 'create', { title: job.title, company: job.company });
    return job;
  }

  updateJob(id: string, userId: string, input: Partial<JobListing>): JobListing {
    this.getJob(id);
    const job = this.listingRepo.update(id, input);
    this.auditLog.log(userId, 'job_listing', id, 'update', input);
    return job;
  }

  deleteJob(id: string, userId: string): boolean {
    this.getJob(id);
    const deleted = this.listingRepo.delete(id);
    if (deleted) this.auditLog.log(userId, 'job_listing', id, 'delete');
    return deleted;
  }

  getJobStats(userId: string): Record<string, number> {
    return this.listingRepo.countByStatus(userId);
  }

  // ── Applications ─────────────────────────────────────────────────────────

  listApplications(userId: string, options?: FindApplicationsOptions): Application[] {
    return this.applicationRepo.findByUserId(userId, options);
  }

  getApplication(id: string, userId?: string): Application {
    const app = this.applicationRepo.findById(id);
    if (!app) throw new NotFoundError('Application', id);
    if (userId && app.userId !== userId) throw new NotFoundError('Application', id);
    return app;
  }

  createApplication(input: CreateApplicationInput): Application {
    const app = this.applicationRepo.create({
      userId: input.userId,
      listingId: input.listingId,
      resumeVersion: input.resumeVersion ?? null,
      coverLetter: input.coverLetter ?? null,
      appliedVia: input.appliedVia ?? 'direct',
      appliedAt: input.appliedAt ?? null,
      status: input.status ?? 'pending',
      notes: input.notes ?? null,
      followUpDate: input.followUpDate ?? null,
      metadata: {},
    } as Omit<Application, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'application', app.id, 'create', { listingId: input.listingId });
    return app;
  }

  updateApplication(id: string, userId: string, input: Partial<Application>): Application {
    this.getApplication(id);
    const app = this.applicationRepo.update(id, input);
    this.auditLog.log(userId, 'application', id, 'update', input);
    return app;
  }

  deleteApplication(id: string, userId: string): boolean {
    this.getApplication(id);
    const deleted = this.applicationRepo.delete(id);
    if (deleted) this.auditLog.log(userId, 'application', id, 'delete');
    return deleted;
  }

  getApplicationStats(userId: string): Record<string, number> {
    return this.applicationRepo.countByStatus(userId);
  }

  // ── Cold Emails ──────────────────────────────────────────────────────────

  listEmails(userId: string, options?: FindColdEmailsOptions): ColdEmail[] {
    return this.emailRepo.findByUserId(userId, options);
  }

  getEmail(id: string, userId?: string): ColdEmail {
    const email = this.emailRepo.findById(id);
    if (!email) throw new NotFoundError('ColdEmail', id);
    if (userId && email.userId !== userId) throw new NotFoundError('ColdEmail', id);
    return email;
  }

  createEmail(input: CreateColdEmailInput): ColdEmail {
    const email = this.emailRepo.create({
      userId: input.userId,
      listingId: input.listingId ?? null,
      recipientName: input.recipientName,
      recipientEmail: input.recipientEmail,
      recipientTitle: input.recipientTitle ?? null,
      company: input.company,
      subject: input.subject,
      body: input.body,
      status: input.status ?? 'drafted',
      sentAt: null,
      followUpCount: 0,
      lastFollowUpAt: null,
    } as Omit<ColdEmail, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'cold_email', email.id, 'create', { company: input.company });
    return email;
  }

  updateEmail(id: string, userId: string, input: Partial<ColdEmail>): ColdEmail {
    this.getEmail(id);
    const email = this.emailRepo.update(id, input);
    this.auditLog.log(userId, 'cold_email', id, 'update', input);
    return email;
  }

  deleteEmail(id: string, userId: string): boolean {
    this.getEmail(id);
    const deleted = this.emailRepo.delete(id);
    if (deleted) this.auditLog.log(userId, 'cold_email', id, 'delete');
    return deleted;
  }

  // ── LinkedIn Outreaches ──────────────────────────────────────────────────

  listOutreaches(userId: string, options?: FindLinkedInOutreachesOptions): LinkedInOutreach[] {
    return this.outreachRepo.findByUserId(userId, options);
  }

  getOutreach(id: string, userId?: string): LinkedInOutreach {
    const outreach = this.outreachRepo.findById(id);
    if (!outreach) throw new NotFoundError('LinkedInOutreach', id);
    if (userId && outreach.userId !== userId) throw new NotFoundError('LinkedInOutreach', id);
    return outreach;
  }

  createOutreach(input: CreateLinkedInOutreachInput): LinkedInOutreach {
    const outreach = this.outreachRepo.create({
      userId: input.userId,
      listingId: input.listingId ?? null,
      personName: input.personName,
      personTitle: input.personTitle ?? null,
      personUrl: input.personUrl ?? null,
      company: input.company,
      message: input.message,
      status: input.status ?? 'drafted',
      sentAt: null,
    } as Omit<LinkedInOutreach, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'linkedin_outreach', outreach.id, 'create', { company: input.company });
    return outreach;
  }

  updateOutreach(id: string, userId: string, input: Partial<LinkedInOutreach>): LinkedInOutreach {
    this.getOutreach(id);
    const outreach = this.outreachRepo.update(id, input);
    this.auditLog.log(userId, 'linkedin_outreach', id, 'update', input);
    return outreach;
  }

  deleteOutreach(id: string, userId: string): boolean {
    this.getOutreach(id);
    const deleted = this.outreachRepo.delete(id);
    if (deleted) this.auditLog.log(userId, 'linkedin_outreach', id, 'delete');
    return deleted;
  }

  // ── Search Sessions ─────────────────────────────────────────────────────

  createSearchSession(input: CreateSearchSessionInput): SearchSession {
    return this.searchSessionRepo.create({
      userId: input.userId,
      query: input.query,
      location: input.location ?? '',
      siteFilter: input.siteFilter ?? '',
      dateFilter: input.dateFilter ?? null,
      totalResults: input.totalResults ?? 0,
      nextStart: input.nextStart ?? 11,
    } as Omit<SearchSession, 'id' | 'createdAt' | 'updatedAt'>);
  }

  getSearchSession(id: string): SearchSession {
    const session = this.searchSessionRepo.findById(id);
    if (!session) throw new NotFoundError('SearchSession', id);
    return session;
  }

  updateSearchSession(id: string, input: Partial<SearchSession>): SearchSession {
    return this.searchSessionRepo.update(id, input);
  }
}
