import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { scoreJob } from '@/lib/ai/job-scorer';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { callLLMStructured } from '@/lib/ai/provider';
import { z } from 'zod';

const jobSearchResultSchema = z.array(z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().default(''),
  salaryRange: z.string().default(''),
  jobType: z.string().default('Full-time'),
  url: z.string().default(''),
  description: z.string().default(''),
  requirements: z.array(z.string()).default([]),
  source: z.string().default('ai-search'),
}));

export async function POST(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const userId = await getCurrentUserId();
    const resume = service.getResume(userId);

    if (!resume) {
      return errorResponse(new Error('No resume uploaded. Please upload your resume first.'));
    }

    const body = await request.json();
    const { query, location, jobType, count = 10 } = body;

    // Use AI to generate relevant job search results based on resume
    const systemPrompt = `You are a job search assistant. Based on the candidate's resume and search criteria, generate a list of realistic job listings that would be a good fit. Generate ${Math.min(count, 20)} job listings.

For each job, provide:
- A realistic job title
- A real or realistic company name
- Location (use the requested location if provided, otherwise suggest good fits)
- Salary range (estimate based on role and location)
- Job type (full-time, part-time, contract, remote)
- A realistic job description (2-3 sentences)
- Key requirements (3-5 bullet points)
- Source (suggest where this job might be found: linkedin, indeed, glassdoor, etc.)

Make the listings diverse - include different companies, seniority levels, and specializations that match the candidate's skills.`;

    const userMessage = `
CANDIDATE PROFILE:
Skills: ${resume.skills?.join(', ') ?? 'Not specified'}
Experience: ${resume.experience?.map(e => `${e.title} at ${e.company}`).join('; ') ?? 'Not specified'}
Education: ${resume.education?.map(e => `${e.degree} in ${e.field} from ${e.school}`).join('; ') ?? 'Not specified'}

SEARCH CRITERIA:
${query ? `Query: ${query}` : 'Find best matching jobs for this candidate'}
${location ? `Preferred location: ${location}` : ''}
${jobType ? `Job type: ${jobType}` : ''}
    `.trim();

    const searchResults = await callLLMStructured(systemPrompt, userMessage, jobSearchResultSchema);
    const jobs = searchResults ?? [];

    // Score each job and save to database
    const savedJobs = [];
    for (const job of jobs) {
      const score = await scoreJob(resume, job as { title: string; company: string; location: string; description: string; requirements: string[] });

      const savedJob = service.createJob({
        userId,
        title: job.title,
        company: job.company,
        location: job.location,
        salaryRange: job.salaryRange || null,
        jobType: job.jobType || null,
        url: job.url || null,
        description: job.description,
        requirements: job.requirements,
        score: score.score,
        scoreReasons: score.reasons,
        source: job.source,
        tags: score.matchedSkills.slice(0, 5),
      });

      savedJobs.push({ ...savedJob, matchedSkills: score.matchedSkills, missingSkills: score.missingSkills });
    }

    // Sort by score descending
    savedJobs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return successResponse(savedJobs);
  } catch (error) {
    return errorResponse(error);
  }
}
