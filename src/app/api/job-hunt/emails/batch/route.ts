import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { generateEmailsBatch } from '@/lib/ai/batch-outreach';

export async function POST(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const userId = await getCurrentUserId();
    const resume = service.getResume(userId);

    if (!resume) {
      return errorResponse(new Error('No resume uploaded.'));
    }

    const body = await request.json();
    const { jobIds, style = 'formal' } = body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return errorResponse(new Error('jobIds array is required.'));
    }

    // Fetch jobs
    const jobs = jobIds.map((id: string) => service.getJob(id, userId));
    const jobsForOutreach = jobs.map(j => ({
      title: j.title,
      company: j.company,
      description: j.description.substring(0, 300),
    }));

    // Generate emails in batch
    const emailResults = await generateEmailsBatch(resume, jobsForOutreach, style);
    const created = [];

    for (const email of emailResults) {
      const job = jobs[email.index];
      if (job) {
        const saved = service.createEmail({
          userId,
          listingId: job.id,
          recipientName: email.recipientName,
          recipientEmail: email.recipientEmail,
          company: job.company,
          subject: email.subject,
          body: email.body,
          status: 'drafted',
        });
        created.push(saved);
      }
    }

    return successResponse({ emails: created, count: created.length });
  } catch (error) {
    return errorResponse(error);
  }
}
