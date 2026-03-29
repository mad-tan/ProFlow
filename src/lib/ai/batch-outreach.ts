/**
 * Batch outreach generation — generates cold emails and LinkedIn messages
 * for multiple jobs in a single LLM call.
 */

import { callLLMStructured } from "./provider";
import { z } from "zod";
import type { Resume } from "@/lib/types";

interface JobForOutreach {
  title: string;
  company: string;
  description: string;
}

// ─── Batch Cold Email ──────────────────────────────────────────────────────

const batchEmailSchema = z.array(
  z.object({
    index: z.number(),
    subject: z.string(),
    body: z.string(),
    recipientName: z.string().default("Hiring Manager"),
    recipientEmail: z.string().default(""),
  })
);

export interface BatchEmailResult {
  index: number;
  subject: string;
  body: string;
  recipientName: string;
  recipientEmail: string;
}

/**
 * Generate cold emails using the user's preferred template format.
 * Template:
 *   Hi,
 *   I came across the {role} position at {company} and believe it aligns perfectly with my skills and experience.
 *   I'm highly interested in applying for this role.
 *   Could you share any insights or advice about the role and the team?
 *   I've attached my resume for your reference and would appreciate it if you could forward it to the hiring team.
 *   Thank you for your time and assistance.
 *   Best regards,
 *   {Name}
 */
export async function generateEmailsBatch(
  resume: Resume,
  jobs: JobForOutreach[],
  style: "formal" | "casual" | "bold" = "formal"
): Promise<BatchEmailResult[]> {
  const name = resume.parsedData?.name ?? "Candidate";
  const results: BatchEmailResult[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    const domain = j.company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";

    results.push({
      index: i,
      subject: `Interest in ${j.title} Role at ${j.company}`,
      body: `Hi,

I hope you're doing well.

I came across the ${j.title} position at ${j.company} and believe it aligns perfectly with my skills and experience. I'm highly interested in applying for this role.

Could you share any insights or advice about the role and the team? I've attached my resume for your reference and would appreciate it if you could forward it to the hiring team.

Thank you for your time and assistance.

Best regards,
${name}`,
      recipientName: "Hiring Manager",
      recipientEmail: `careers@${domain}`,
    });
  }

  return results;
}

/**
 * Generate follow-up emails for jobs where initial email was already sent.
 */
export function generateFollowUpEmail(
  name: string,
  jobTitle: string,
  company: string
): { subject: string; body: string } {
  return {
    subject: `Re: Interest in ${jobTitle} Role at ${company}`,
    body: `Hi,

Just following up on my note below in case it got buried. If you have a moment, I'd really appreciate any quick insight on the role, or if you're not the right person, a pointer to who I should reach out to.

Thanks again,

${name}`,
  };
}

// ─── Batch LinkedIn ────────────────────────────────────────────────────────

const batchLinkedInSchema = z.array(
  z.object({
    index: z.number(),
    message: z.string(),
    personName: z.string().default("Hiring Manager"),
    personTitle: z.string().default("Recruiter"),
    linkedinSearchUrl: z.string().default(""),
  })
);

export interface BatchLinkedInResult {
  index: number;
  message: string;
  personName: string;
  personTitle: string;
  linkedinSearchUrl: string;
}

export async function generateLinkedInBatch(
  resume: Resume,
  jobs: JobForOutreach[],
  approach: "referral" | "informational" | "direct" = "direct"
): Promise<BatchLinkedInResult[]> {
  const LINKEDIN_BATCH_SIZE = 5;
  const results: BatchLinkedInResult[] = [];
  const name = resume.parsedData?.name ?? "Candidate";
  const topSkills = resume.skills?.slice(0, 4).join(", ") ?? "";

  for (let i = 0; i < jobs.length; i += LINKEDIN_BATCH_SIZE) {
    const batch = jobs.slice(i, i + LINKEDIN_BATCH_SIZE);
    const jobsList = batch.map((j, idx) => `JOB ${i + idx}: ${j.title} at ${j.company}`).join("\n");

    const systemPrompt = `You are writing LinkedIn connection request messages for a job seeker named ${name}.
Their top skills: ${topSkills}.

For each job, write a LinkedIn connection request to a recruiter or hiring manager at that company.

RULES:
- STRICT 280 character limit per message (LinkedIn enforces this)
- Be specific: mention the EXACT role title and company name
- Mention 1-2 specific relevant skills from the candidate
- Sound natural and human, not robotic or template-like
- Don't use generic phrases like "I'd love to connect" or "hope you're doing well"
- Start with something specific about the role or company
- End with a soft ask (insight into role, referral, quick chat)
- Approach style: ${approach}

Also suggest a realistic recruiter name and title for each company.
Generate a LinkedIn people search URL for each company like:
https://www.linkedin.com/company/{company-slug}/people/?keywords=recruiter`;

    const userMessage = `${jobsList}

Write a LinkedIn connection request for each. Remember: 280 chars max, be specific.`;

    const batchResult = await callLLMStructured(systemPrompt, userMessage, batchLinkedInSchema);
    if (batchResult) {
      results.push(...batchResult);
    } else {
      // Fallback with better quality
      batch.forEach((j, idx) => {
        const companySlug = j.company.toLowerCase().replace(/[^a-z0-9]/g, "");
        results.push({
          index: i + idx,
          message: `Hi! Saw the ${j.title} opening at ${j.company} — my background in ${topSkills} is a strong fit. Would love a quick intro or any tips on the application process.`,
          personName: "Recruiter",
          personTitle: "Technical Recruiter",
          linkedinSearchUrl: `https://www.linkedin.com/company/${companySlug}/people/?keywords=recruiter`,
        });
      });
    }
  }

  return results;
}
