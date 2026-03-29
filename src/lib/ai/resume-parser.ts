import { callLLMStructured } from './provider';
import { z } from 'zod';

const parsedResumeSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  summary: z.string().default(''),
  links: z.array(z.object({ type: z.string(), url: z.string() })).default([]),
  skills: z.array(z.string()).default([]),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    startDate: z.string().default(''),
    endDate: z.string().default(''),
    description: z.string().default(''),
    achievements: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().default(''),
    field: z.string().default(''),
    gradDate: z.string().default(''),
    gpa: z.string().optional(),
  })).default([]),
});

type ParsedResumeResult = z.infer<typeof parsedResumeSchema>;

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const pdf = new PDFParse({ data: Uint8Array.from(buffer) });
    const textResult = await pdf.getText();
    await pdf.destroy();
    return textResult.text;
  } catch (err) {
    console.error('[resume-parser] PDF parse error:', err);
    return '';
  }
}

export async function parseResumePDF(buffer: Buffer, fileName: string): Promise<{
  rawText: string;
  parsedData: ParsedResumeResult;
  skills: string[];
  experience: ParsedResumeResult['experience'];
  education: ParsedResumeResult['education'];
}> {
  let rawText = '';

  if (fileName.endsWith('.pdf')) {
    rawText = await extractTextFromPDF(buffer);
  } else {
    // For DOCX, extract as plain text (basic approach)
    rawText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  }

  // Use AI to parse structured data
  const systemPrompt = `You are a resume parser. Extract structured information from the resume text provided. Be thorough and accurate. Extract ALL skills mentioned, ALL work experience entries, and ALL education entries. For skills, include both technical and soft skills. Return the data in the exact JSON structure requested.`;

  const parsed = await callLLMStructured(
    systemPrompt,
    `Parse this resume:\n\n${rawText.substring(0, 10000)}`,
    parsedResumeSchema
  );

  const result = parsed ?? {
    name: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    links: [],
    skills: [],
    experience: [],
    education: [],
  };

  return {
    rawText,
    parsedData: { name: result.name, email: result.email, phone: result.phone, location: result.location, summary: result.summary, links: result.links },
    skills: result.skills,
    experience: result.experience,
    education: result.education,
  };
}
