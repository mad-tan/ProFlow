import useSWR, { mutate } from "swr";
import type { Resume, JobListing, Application, ColdEmail, LinkedInOutreach } from "@/lib/types";
import { fetcher, apiPost, apiPatch, apiDelete } from "./use-fetch";

// ─── Cache Invalidation ─────────────────────────────────────────────────────

function invalidateJobs(): Promise<unknown> {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/job-hunt/jobs"));
}
function invalidateApplications(): Promise<unknown> {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/job-hunt/applications"));
}
function invalidateEmails(): Promise<unknown> {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/job-hunt/emails"));
}
function invalidateOutreaches(): Promise<unknown> {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/job-hunt/outreaches"));
}
function invalidateResume(): Promise<unknown> {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/job-hunt/resume"));
}

// ─── Resume Hook ────────────────────────────────────────────────────────────

export function useResume() {
  const { data, error, isLoading } = useSWR<Resume | null>("/api/job-hunt/resume", fetcher);

  return {
    resume: data,
    isLoading,
    error,

    async uploadResume(file: File): Promise<Resume> {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/job-hunt/resume", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Upload failed");
      }
      const json = await res.json();
      await invalidateResume();
      return json.data;
    },

    async deleteResume(): Promise<void> {
      await apiDelete("/api/job-hunt/resume");
      await invalidateResume();
    },
  };
}

// ─── Job Listings Hook ──────────────────────────────────────────────────────

export interface JobListingFilters {
  search?: string;
  status?: string;
  source?: string;
}

function buildJobsUrl(filters?: JobListingFilters): string {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.source) params.set("source", filters.source);
  const qs = params.toString();
  return `/api/job-hunt/jobs${qs ? `?${qs}` : ""}`;
}

export function useJobListings(filters?: JobListingFilters) {
  const url = buildJobsUrl(filters);
  const { data, error, isLoading, isValidating } = useSWR<JobListing[]>(url, fetcher);

  return {
    jobs: data,
    isLoading,
    isValidating,
    error,

    async createJob(input: Partial<JobListing>): Promise<JobListing> {
      const created = await apiPost<JobListing>("/api/job-hunt/jobs", input);
      await invalidateJobs();
      return created;
    },

    async updateJob(id: string, input: Partial<JobListing>): Promise<JobListing> {
      const updated = await apiPatch<JobListing>(`/api/job-hunt/jobs/${id}`, input);
      await invalidateJobs();
      return updated;
    },

    async deleteJob(id: string): Promise<void> {
      await apiDelete(`/api/job-hunt/jobs/${id}`);
      await invalidateJobs();
    },

    async searchJobs(query?: string, location?: string, jobType?: string, count?: number): Promise<JobListing[]> {
      const results = await apiPost<JobListing[]>("/api/job-hunt/jobs/search", {
        query, location, jobType, count,
      });
      await invalidateJobs();
      return results;
    },

    async scoreJob(jobId: string): Promise<JobListing> {
      const updated = await apiPost<JobListing>(`/api/job-hunt/jobs/${jobId}/score`, {});
      await invalidateJobs();
      return updated;
    },
  };
}

// ─── Applications Hook ──────────────────────────────────────────────────────

export interface ApplicationFilters {
  status?: string;
  listingId?: string;
}

function buildAppsUrl(filters?: ApplicationFilters): string {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.listingId) params.set("listingId", filters.listingId);
  const qs = params.toString();
  return `/api/job-hunt/applications${qs ? `?${qs}` : ""}`;
}

export function useApplications(filters?: ApplicationFilters) {
  const url = buildAppsUrl(filters);
  const { data, error, isLoading } = useSWR<Application[]>(url, fetcher);

  return {
    applications: data,
    isLoading,
    error,

    async createApplication(input: Record<string, unknown>): Promise<Application> {
      const created = await apiPost<Application>("/api/job-hunt/applications", input);
      await invalidateApplications();
      await invalidateJobs();
      return created;
    },

    async updateApplication(id: string, input: Record<string, unknown>): Promise<Application> {
      const updated = await apiPatch<Application>(`/api/job-hunt/applications/${id}`, input);
      await invalidateApplications();
      return updated;
    },

    async deleteApplication(id: string): Promise<void> {
      await apiDelete(`/api/job-hunt/applications/${id}`);
      await invalidateApplications();
    },
  };
}

// ─── Cold Emails Hook ───────────────────────────────────────────────────────

export function useColdEmails(listingId?: string) {
  const params = new URLSearchParams();
  if (listingId) params.set("listingId", listingId);
  const qs = params.toString();
  const url = `/api/job-hunt/emails${qs ? `?${qs}` : ""}`;

  const { data, error, isLoading } = useSWR<ColdEmail[]>(url, fetcher);

  return {
    emails: data,
    isLoading,
    error,

    async createEmail(input: Record<string, unknown>): Promise<ColdEmail> {
      const created = await apiPost<ColdEmail>("/api/job-hunt/emails", input);
      await invalidateEmails();
      return created;
    },

    async updateEmail(id: string, input: Record<string, unknown>): Promise<ColdEmail> {
      const updated = await apiPatch<ColdEmail>(`/api/job-hunt/emails/${id}`, input);
      await invalidateEmails();
      return updated;
    },

    async deleteEmail(id: string): Promise<void> {
      await apiDelete(`/api/job-hunt/emails/${id}`);
      await invalidateEmails();
    },

    async generateEmail(data: Record<string, unknown>): Promise<{ subject: string; body: string }> {
      return apiPost<{ subject: string; body: string }>("/api/job-hunt/emails/generate", data);
    },
  };
}

// ─── LinkedIn Outreaches Hook ───────────────────────────────────────────────

export function useLinkedInOutreaches(listingId?: string) {
  const params = new URLSearchParams();
  if (listingId) params.set("listingId", listingId);
  const qs = params.toString();
  const url = `/api/job-hunt/outreaches${qs ? `?${qs}` : ""}`;

  const { data, error, isLoading } = useSWR<LinkedInOutreach[]>(url, fetcher);

  return {
    outreaches: data,
    isLoading,
    error,

    async createOutreach(input: Record<string, unknown>): Promise<LinkedInOutreach> {
      const created = await apiPost<LinkedInOutreach>("/api/job-hunt/outreaches", input);
      await invalidateOutreaches();
      return created;
    },

    async updateOutreach(id: string, input: Record<string, unknown>): Promise<LinkedInOutreach> {
      const updated = await apiPatch<LinkedInOutreach>(`/api/job-hunt/outreaches/${id}`, input);
      await invalidateOutreaches();
      return updated;
    },

    async deleteOutreach(id: string): Promise<void> {
      await apiDelete(`/api/job-hunt/outreaches/${id}`);
      await invalidateOutreaches();
    },

    async generateMessage(data: Record<string, unknown>): Promise<{ message: string }> {
      return apiPost<{ message: string }>("/api/job-hunt/outreaches/generate", data);
    },
  };
}

// ─── Tailor Hook ────────────────────────────────────────────────────────────

export function useTailorResume() {
  return {
    async tailorForJob(data: Record<string, unknown>) {
      return apiPost<Record<string, unknown>>("/api/job-hunt/resume/tailor", data);
    },
  };
}
