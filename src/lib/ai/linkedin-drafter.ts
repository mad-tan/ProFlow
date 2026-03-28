import { callLLM } from './provider';
import type { Resume } from '@/lib/types';

export interface LinkedInPerson {
  name: string;
  title: string | null;
  company: string;
  profileUrl: string | null;
}

export type OutreachApproach = 'referral' | 'informational' | 'direct';

export async function draftConnectionRequest(
  resume: Resume,
  person: LinkedInPerson,
  jobTitle: string,
  approach: OutreachApproach = 'referral'
): Promise<string> {
  const approachGuide = {
    referral: 'Ask for a referral naturally. Mention shared background or interests.',
    informational: 'Request an informational chat about the role/company. Show genuine curiosity.',
    direct: 'Express direct interest in the role and ask if they can help or point you to the right person.',
  };

  const systemPrompt = `You are an expert at writing LinkedIn connection request messages. Rules:
1. MAXIMUM 300 characters (LinkedIn limit for connection requests)
2. Be personal and specific - mention something about them or the company
3. Don't be generic or salesy
4. Approach: ${approachGuide[approach]}
5. If the person seems to be of Indian origin, you can subtly reference shared cultural background
6. Return ONLY the message text, nothing else`;

  const userMessage = `
Sender: ${resume.parsedData?.name ?? 'Job Seeker'}, ${resume.experience?.[0]?.title ?? ''} at ${resume.experience?.[0]?.company ?? ''}
Recipient: ${person.name}, ${person.title ?? 'Employee'} at ${person.company}
Target role: ${jobTitle} at ${person.company}
  `.trim();

  const result = await callLLM(systemPrompt, userMessage);

  if (!result) {
    return `Hi ${person.name}, I'm interested in the ${jobTitle} role at ${person.company}. Would love to connect and learn more about your experience there!`;
  }

  // Ensure it's under 300 chars
  return result.trim().substring(0, 300);
}

export async function draftInMail(
  resume: Resume,
  person: LinkedInPerson,
  jobTitle: string
): Promise<{ subject: string; body: string }> {
  const systemPrompt = `Write a LinkedIn InMail message for a job seeker reaching out to someone at a target company. Rules:
1. Subject: Under 60 characters, compelling
2. Body: Under 200 words
3. Be personal and reference something specific about the recipient or company
4. Include a clear ask (referral, intro, or informational chat)
5. Format: "Subject: ..." on first line, blank line, then body`;

  const userMessage = `
Sender: ${resume.parsedData?.name ?? 'Job Seeker'}
Skills: ${resume.skills?.slice(0, 5).join(', ') ?? ''}
Current role: ${resume.experience?.[0]?.title ?? ''} at ${resume.experience?.[0]?.company ?? ''}
Recipient: ${person.name}, ${person.title ?? 'Employee'} at ${person.company}
Target role: ${jobTitle}
  `.trim();

  const result = await callLLM(systemPrompt, userMessage);

  if (!result) {
    return {
      subject: `Interested in ${jobTitle} at ${person.company}`,
      body: `Hi ${person.name},\n\nI'm exploring the ${jobTitle} opportunity at ${person.company} and would love to connect.\n\nBest,\n${resume.parsedData?.name ?? ''}`,
    };
  }

  const lines = result.trim().split('\n');
  const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
  const subject = subjectLine?.replace(/^subject:\s*/i, '').trim() ?? `${jobTitle} at ${person.company}`;
  const bodyStart = subjectLine ? lines.indexOf(subjectLine) + 1 : 0;
  const body = lines.slice(bodyStart).join('\n').trim();

  return { subject, body };
}
