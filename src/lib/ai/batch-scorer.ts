/**
 * Batch job scoring — scores multiple jobs in a single LLM call.
 * Reduces AI calls from N to ceil(N/5).
 */

import { callLLMStructured } from "./provider";
import { z } from "zod";
import type { Resume } from "@/lib/types";

export interface BatchJobScore {
  index: number;
  score: number;
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
}

interface JobSummary {
  title: string;
  company: string;
  description: string;
  requirements: string[];
}

const BATCH_SIZE = 5;

const batchScoreSchema = z.array(
  z.object({
    index: z.number(),
    score: z.number(),
    reasons: z.array(z.string()).default([]),
    matchedSkills: z.array(z.string()).default([]),
    missingSkills: z.array(z.string()).default([]),
  })
);

function buildResumeContext(resume: Resume): string {
  return `CANDIDATE:
Skills: ${resume.skills?.join(", ") ?? "Not specified"}
Experience: ${resume.experience?.map(e => `${e.title} at ${e.company} (${e.startDate}-${e.endDate})`).join("; ") ?? "Not specified"}
Education: ${resume.education?.map(e => `${e.degree} in ${e.field} from ${e.school}`).join("; ") ?? "Not specified"}`;
}

function buildJobSummary(job: JobSummary, index: number): string {
  const desc = job.description.substring(0, 500);
  const reqs = job.requirements.slice(0, 5).join(", ");
  return `JOB ${index}: ${job.title} at ${job.company}
Description: ${desc}
Requirements: ${reqs || "Not specified"}`;
}

async function scoreBatch(
  resumeContext: string,
  jobs: { index: number; job: JobSummary }[]
): Promise<BatchJobScore[]> {
  const jobSummaries = jobs.map(j => buildJobSummary(j.job, j.index)).join("\n\n");

  const systemPrompt = `You are a job-resume match scorer. For each job, score how well the candidate matches on a scale of 0-100.
Consider: skill overlap, experience relevance, seniority fit. Be realistic — a perfect match is rare.
Return an array of scores, one per job, in the same order.`;

  const userMessage = `${resumeContext}

${jobSummaries}

Score each job (0-100) and list matched/missing skills.`;

  const result = await callLLMStructured(systemPrompt, userMessage, batchScoreSchema);
  if (!result) {
    // Return default scores on failure
    return jobs.map(j => ({
      index: j.index,
      score: 50,
      reasons: ["Could not score — AI unavailable"],
      matchedSkills: [],
      missingSkills: [],
    }));
  }

  return result;
}

/**
 * Score multiple jobs against a resume using batched LLM calls.
 */
export async function batchScoreJobs(
  resume: Resume,
  jobs: JobSummary[]
): Promise<BatchJobScore[]> {
  const resumeContext = buildResumeContext(resume);
  const allScores: BatchJobScore[] = [];

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE).map((job, idx) => ({
      index: i + idx,
      job,
    }));

    const scores = await scoreBatch(resumeContext, batch);
    allScores.push(...scores);
  }

  return allScores;
}
