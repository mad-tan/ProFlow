import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { discoverRecruiters } from '@/lib/services/recruiter-finder';

export async function POST(request: NextRequest) {
  try {
    await getCurrentUserId(); // Auth check
    const body = await request.json();
    const { company, domain } = body;

    if (!company) {
      return errorResponse(new Error('Company name is required.'));
    }

    const recruiters = await discoverRecruiters(company, domain);
    return successResponse({ recruiters, count: recruiters.length });
  } catch (error) {
    return errorResponse(error);
  }
}
