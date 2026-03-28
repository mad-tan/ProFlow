import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { parseResumePDF } from '@/lib/ai/resume-parser';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const service = new JobHuntService();
    const resume = service.getResume(await getCurrentUserId());
    return successResponse(resume ?? null);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const userId = await getCurrentUserId();

    const formData = await request.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return errorResponse(new Error('No resume file provided'), 'No file uploaded');
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      return errorResponse(new Error('Invalid file type. Upload a PDF or DOCX.'), 'Invalid file type');
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(new Error('File too large. Maximum size is 10MB.'), 'File too large');
    }

    // Save file to disk
    const uploadsDir = join(process.cwd(), 'data', 'resumes', userId);
    await mkdir(uploadsDir, { recursive: true });
    const filePath = join(uploadsDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Capture existing resume ID before creating new one
    const existingResumeId = service.getResume(userId)?.id;

    // Parse the resume first (before deleting old one, so we don't lose data on parse failure)
    const parsed = await parseResumePDF(buffer, file.name);

    const resume = service.createResume({
      userId,
      fileName: file.name,
      filePath,
      rawText: parsed.rawText,
      parsedData: parsed.parsedData as unknown as Record<string, unknown>,
      skills: parsed.skills,
      experience: parsed.experience as unknown as Record<string, unknown>[],
      education: parsed.education as unknown as Record<string, unknown>[],
    });

    // Delete old resume after successful creation of new one
    if (existingResumeId) {
      service.deleteResume(existingResumeId, userId);
    }

    return createdResponse(resume);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    const service = new JobHuntService();
    const userId = await getCurrentUserId();
    const resume = service.getResume(userId);
    if (resume) {
      service.deleteResume(resume.id, userId);
    }
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
