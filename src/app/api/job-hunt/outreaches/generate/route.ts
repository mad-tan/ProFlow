import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { draftConnectionRequest } from '@/lib/ai/linkedin-drafter';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const userId = await getCurrentUserId();
    const resume = service.getResume(userId);

    if (!resume) {
      return errorResponse(new Error('No resume uploaded. Please upload your resume first.'));
    }

    const body = await request.json();
    const { personName, personTitle, company, personUrl, jobTitle, approach = 'referral' } = body;

    if (!personName || !company) {
      return errorResponse(new Error('personName and company are required'));
    }

    const message = await draftConnectionRequest(
      resume,
      { name: personName, title: personTitle ?? null, company, profileUrl: personUrl ?? null },
      jobTitle ?? 'a role',
      approach
    );

    return successResponse({ message });
  } catch (error) {
    return errorResponse(error);
  }
}
