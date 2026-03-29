import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { generateLinkedInBatch } from '@/lib/ai/batch-outreach';

export async function POST(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const userId = await getCurrentUserId();
    const resume = service.getResume(userId);

    if (!resume) {
      return errorResponse(new Error('No resume uploaded.'));
    }

    const body = await request.json();
    const { jobIds, approach = 'direct' } = body;

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

    // Generate LinkedIn messages in batch
    const results = await generateLinkedInBatch(resume, jobsForOutreach, approach);
    const created = [];

    for (const msg of results) {
      const job = jobs[msg.index];
      if (job) {
        const saved = service.createOutreach({
          userId,
          listingId: job.id,
          personName: msg.personName,
          personTitle: msg.personTitle,
          personUrl: msg.linkedinSearchUrl || null,
          company: job.company,
          message: msg.message,
          status: 'drafted',
        });
        created.push(saved);
      }
    }

    return successResponse({ outreaches: created, count: created.length });
  } catch (error) {
    return errorResponse(error);
  }
}
