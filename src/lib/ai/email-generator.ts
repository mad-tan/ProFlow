import { callLLM } from './provider';
import type { Resume } from '@/lib/types';

export interface EmailRecipient {
  name: string;
  title: string | null;
  company: string;
}

export type EmailStyle = 'formal' | 'casual' | 'bold';

export async function generateColdEmail(
  resume: Resume,
  jobTitle: string,
  recipient: EmailRecipient,
  style: EmailStyle = 'formal'
): Promise<{ subject: string; body: string }> {
  const styleGuide = {
    formal: 'Professional and polished. Use formal language.',
    casual: 'Friendly and conversational but still professional. Show personality.',
    bold: 'Confident and attention-grabbing. Lead with your strongest value proposition.',
  };

  const systemPrompt = `You are an expert cold email writer for job seekers. Write a compelling cold email that gets responses. Rules:
1. Keep subject line under 50 characters, make it intriguing
2. Keep body under 150 words
3. Personalize to the recipient's role
4. Include a specific value proposition based on the candidate's skills
5. End with a clear, low-pressure call to action
6. Style: ${styleGuide[style]}
7. Do NOT use generic phrases like "I hope this email finds you well"
8. Format: Return ONLY the email with "Subject: ..." on the first line, then a blank line, then the body`;

  const userMessage = `
Candidate: ${resume.parsedData?.name ?? 'Job Seeker'}
Top skills: ${resume.skills?.slice(0, 5).join(', ') ?? ''}
Current/recent role: ${resume.experience?.[0]?.title ?? ''} at ${resume.experience?.[0]?.company ?? ''}
Target job: ${jobTitle}
Recipient: ${recipient.name}, ${recipient.title ?? 'Hiring Manager'} at ${recipient.company}
  `.trim();

  const result = await callLLM(systemPrompt, userMessage);

  if (!result) {
    return {
      subject: `${jobTitle} opportunity at ${recipient.company}`,
      body: `Hi ${recipient.name},\n\nI noticed the ${jobTitle} opening at ${recipient.company} and believe my experience would be a great fit.\n\nWould you be open to a brief conversation?\n\nBest regards,\n${resume.parsedData?.name ?? ''}`,
    };
  }

  // Parse subject and body from response
  const lines = result.trim().split('\n');
  const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
  const subject = subjectLine?.replace(/^subject:\s*/i, '').trim() ?? `Re: ${jobTitle} at ${recipient.company}`;
  const bodyStart = subjectLine ? lines.indexOf(subjectLine) + 1 : 0;
  const body = lines.slice(bodyStart).join('\n').trim();

  return { subject, body };
}

export async function generateFollowUp(
  originalSubject: string,
  originalBody: string,
  recipientName: string,
  followUpNumber: number
): Promise<{ subject: string; body: string }> {
  const systemPrompt = `Write a follow-up email #${followUpNumber}. Rules:
1. Keep it shorter than the original (under 80 words)
2. Reference the previous email naturally
3. Add new value or information
4. Remain professional and not pushy
5. If this is follow-up #2+, consider asking if they're the right person to talk to
6. Format: "Subject: ..." on first line, blank line, then body`;

  const userMessage = `
Original subject: ${originalSubject}
Original email: ${originalBody}
Recipient: ${recipientName}
Follow-up number: ${followUpNumber}
  `.trim();

  const result = await callLLM(systemPrompt, userMessage);

  if (!result) {
    return {
      subject: `Re: ${originalSubject}`,
      body: `Hi ${recipientName},\n\nJust following up on my previous email. I'd love to connect if you have a moment.\n\nBest regards`,
    };
  }

  const lines = result.trim().split('\n');
  const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
  const subject = subjectLine?.replace(/^subject:\s*/i, '').trim() ?? `Re: ${originalSubject}`;
  const bodyStart = subjectLine ? lines.indexOf(subjectLine) + 1 : 0;
  const body = lines.slice(bodyStart).join('\n').trim();

  return { subject, body };
}
