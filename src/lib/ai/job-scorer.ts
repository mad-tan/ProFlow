import { callLLMStructured } from './provider';
import { z } from 'zod';
import type { Resume, JobListing } from '@/lib/types';

const jobScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  salaryFit: z.string().default('Unknown'),
  locationFit: z.string().default('Unknown'),
});

export type JobScore = z.infer<typeof jobScoreSchema>;

export async function scoreJob(resume: Resume, job: Partial<JobListing>): Promise<JobScore> {
  const systemPrompt = `You are a job fit scoring expert. Analyze how well a candidate's resume matches a job listing. Score from 0-100 where:
- 90-100: Perfect match, exceeds requirements
- 70-89: Strong match, meets most requirements
- 50-69: Moderate match, meets some requirements
- 30-49: Weak match, missing key requirements
- 0-29: Poor match

Be specific about which skills match and which are missing. Consider: skills match, experience level, education, location, and any salary information.`;

  const userMessage = `
CANDIDATE RESUME:
Name: ${resume.parsedData?.name ?? 'Unknown'}
Skills: ${resume.skills?.join(', ') ?? 'None listed'}
Experience: ${JSON.stringify(resume.experience?.slice(0, 5) ?? [])}
Education: ${JSON.stringify(resume.education ?? [])}

JOB LISTING:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salaryRange ?? 'Not specified'}
Description: ${(job.description ?? '').substring(0, 3000)}
Requirements: ${JSON.stringify(job.requirements ?? [])}
  `.trim();

  const result = await callLLMStructured(systemPrompt, userMessage, jobScoreSchema);

  return result ?? {
    score: 0,
    reasons: ['Unable to score - AI unavailable'],
    matchedSkills: [],
    missingSkills: [],
    salaryFit: 'Unknown',
    locationFit: 'Unknown',
  };
}

export async function scoreJobsBatch(resume: Resume, jobs: Partial<JobListing>[]): Promise<JobScore[]> {
  const results: JobScore[] = [];
  for (const job of jobs) {
    const score = await scoreJob(resume, job);
    results.push(score);
  }
  return results;
}
