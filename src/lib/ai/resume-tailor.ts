import { callLLMStructured, callLLM } from './provider';
import { z } from 'zod';
import type { Resume } from '@/lib/types';

const tailoredResumeSchema = z.object({
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    achievements: z.array(z.string()),
  })),
  atsKeywords: z.array(z.string()),
  changes: z.array(z.string()),
});

export type TailoredResume = z.infer<typeof tailoredResumeSchema>;

export async function tailorResume(
  resume: Resume,
  jobTitle: string,
  jobDescription: string,
  jobRequirements: string[]
): Promise<TailoredResume> {
  const systemPrompt = `You are an expert ATS resume optimizer. Your job is to tailor a candidate's resume for a specific job posting. Rules:
1. Keep all information truthful - only reword, never fabricate
2. Prioritize skills and achievements that match the job description
3. Use keywords from the job posting naturally in the resume
4. Rewrite achievement bullets using the STAR method with quantified results where possible
5. Order skills with the most relevant to the job first
6. Keep the summary/objective focused on what you bring to THIS specific role
7. Return the list of ATS keywords you injected and what changes you made`;

  const userMessage = `
ORIGINAL RESUME:
Name: ${resume.parsedData?.name ?? 'Unknown'}
Summary: ${resume.parsedData?.summary ?? ''}
Skills: ${resume.skills?.join(', ') ?? ''}
Experience: ${JSON.stringify(resume.experience ?? [])}
Education: ${JSON.stringify(resume.education ?? [])}

TARGET JOB:
Title: ${jobTitle}
Description: ${jobDescription.substring(0, 4000)}
Requirements: ${jobRequirements.join(', ')}

Tailor this resume for the target job. Return a restructured resume optimized for ATS systems.
  `.trim();

  const result = await callLLMStructured(systemPrompt, userMessage, tailoredResumeSchema);

  return result ?? {
    summary: resume.parsedData?.summary ?? '',
    skills: resume.skills ?? [],
    experience: (resume.experience ?? []).map(e => ({
      company: e.company,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      achievements: e.achievements,
    })),
    atsKeywords: [],
    changes: ['AI unavailable - returning original resume'],
  };
}

export async function generateCoverLetter(
  resume: Resume,
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<string> {
  const systemPrompt = `You are an expert cover letter writer. Write a concise, compelling cover letter (3-4 paragraphs) that:
1. Opens with enthusiasm for the specific role and company
2. Highlights 2-3 most relevant experiences/skills from the resume
3. Shows understanding of the company's needs based on the job description
4. Closes with a clear call to action
Keep it under 300 words. Be professional but personable.`;

  const userMessage = `
Resume skills: ${resume.skills?.join(', ') ?? ''}
Recent role: ${resume.experience?.[0]?.title ?? ''} at ${resume.experience?.[0]?.company ?? ''}
Target: ${jobTitle} at ${company}
Job description: ${jobDescription.substring(0, 3000)}
  `.trim();

  return (await callLLM(systemPrompt, userMessage)) ?? `Dear Hiring Manager,\n\nI am writing to express my interest in the ${jobTitle} position at ${company}.\n\nSincerely`;
}
