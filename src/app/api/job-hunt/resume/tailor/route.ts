import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { tailorResume, generateCoverLetter } from '@/lib/ai/resume-tailor';
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
    const { jobId, jobTitle, jobDescription, jobRequirements, includeCoverLetter } = body;

    let title = jobTitle ?? '';
    let description = jobDescription ?? '';
    let requirements = jobRequirements ?? [];
    let company = '';

    // If jobId provided, get job details
    if (jobId) {
      const job = service.getJob(jobId);
      title = job.title;
      description = job.description;
      requirements = job.requirements;
      company = job.company;
    }

    if (!title && !description) {
      return errorResponse(new Error('Provide either a jobId or jobTitle + jobDescription'));
    }

    const tailored = await tailorResume(resume, title, description, requirements);

    let coverLetter: string | undefined;
    if (includeCoverLetter && company) {
      coverLetter = await generateCoverLetter(resume, title, company, description);
    }

    return successResponse({
      tailoredResume: tailored,
      coverLetter: coverLetter ?? null,
      originalResume: {
        name: resume.parsedData?.name,
        email: resume.parsedData?.email,
        phone: resume.parsedData?.phone,
        location: resume.parsedData?.location,
        education: resume.education,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
