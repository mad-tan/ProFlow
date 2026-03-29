import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { searchGoogleJobs } from '@/lib/services/google-search';
import { scrapeJobPages } from '@/lib/services/job-scraper';
import { batchScoreJobs } from '@/lib/ai/batch-scorer';
import { generateEmailsBatch } from '@/lib/ai/batch-outreach';
import { generateLinkedInBatch } from '@/lib/ai/batch-outreach';
import { getNow } from '@/lib/utils/dates';

/**
 * Full automated pipeline: search -> scrape -> score -> generate emails -> generate linkedin
 * For jobs scoring >= 60: auto-generates outreach drafts.
 */
export async function POST(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const userId = await getCurrentUserId();
    const resume = service.getResume(userId);

    if (!resume) {
      return errorResponse(new Error('No resume uploaded. Please upload your resume first.'));
    }

    const body = await request.json();
    const { query, location, dateAfter, scoreThreshold = 60 } = body;

    if (!query) {
      return errorResponse(new Error('Search query is required.'));
    }

    // 1. Search Google for real job URLs
    const yesterday = getYesterday();
    const searchResults = await searchGoogleJobs(query, {
      location,
      dateAfter: dateAfter ?? yesterday,
    });

    if (searchResults.items.length === 0) {
      return successResponse({
        jobs: [],
        searchSessionId: null,
        hasMore: false,
        totalResults: 0,
        emailsGenerated: 0,
        linkedinGenerated: 0,
      });
    }

    // 2. Create search session
    const session = service.createSearchSession({
      userId,
      query,
      location: location ?? '',
      dateFilter: dateAfter ?? yesterday,
      totalResults: searchResults.totalResults,
      nextStart: searchResults.nextStartIndex ?? 0,
    });

    // 3. Scrape only job pages that don't already have descriptions from board APIs
    const urlsToScrape = searchResults.items
      .filter(item => !item.description)
      .map(item => item.link);

    const scraped = urlsToScrape.length > 0
      ? await scrapeJobPages(urlsToScrape)
      : new Map<string, null>();

    // 4. Save jobs to DB
    const jobsForScoring: { title: string; company: string; description: string; requirements: string[] }[] = [];
    const savedJobs: ReturnType<typeof service.createJob>[] = [];

    for (const item of searchResults.items) {
      const data = scraped.get(item.link);
      const title = data?.title || item.title.split(' - ')[0].split(' | ')[0].trim();
      const company = item.company || data?.company || extractCompanyFromResult(item);
      const description = item.description || data?.description || item.snippet;
      const requirements = data?.requirements ?? [];

      const savedJob = service.createJob({
        userId,
        title,
        company,
        location: item.location || data?.location || '',
        salaryRange: data?.salaryRange ?? null,
        jobType: data?.jobType ?? null,
        url: item.link,
        description,
        requirements,
        source: new URL(item.link).hostname,
        score: null,
        scoreReasons: [],
        tags: [],
      });

      service.updateJob(savedJob.id, userId, {
        searchSessionId: session.id,
        scrapedAt: data ? getNow() : null,
      } as Partial<typeof savedJob>);

      savedJobs.push(savedJob);
      jobsForScoring.push({ title, company, description: description.substring(0, 500), requirements });
    }

    // 5. Batch score all jobs
    const scores = await batchScoreJobs(resume, jobsForScoring);

    for (const score of scores) {
      const job = savedJobs[score.index];
      if (job) {
        service.updateJob(job.id, userId, {
          score: score.score,
          scoreReasons: score.reasons,
          tags: score.matchedSkills.slice(0, 5),
        });
      }
    }

    // Re-fetch updated jobs
    const updatedJobs = savedJobs.map(j => service.getJob(j.id));
    updatedJobs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // 6. Auto-generate outreach for high-scoring jobs
    const highScoreJobs = updatedJobs.filter(j => (j.score ?? 0) >= scoreThreshold);
    let emailsGenerated = 0;
    let linkedinGenerated = 0;

    if (highScoreJobs.length > 0) {
      const jobsForOutreach = highScoreJobs.map(j => ({
        title: j.title,
        company: j.company,
        description: j.description.substring(0, 300),
      }));

      // Generate emails
      const emailResults = await generateEmailsBatch(resume, jobsForOutreach);
      for (const email of emailResults) {
        const job = highScoreJobs[email.index];
        if (job) {
          service.createEmail({
            userId,
            listingId: job.id,
            recipientName: email.recipientName,
            recipientEmail: email.recipientEmail,
            company: job.company,
            subject: email.subject,
            body: email.body,
            status: 'drafted',
          });
          emailsGenerated++;
        }
      }

      // Generate LinkedIn messages
      const linkedinResults = await generateLinkedInBatch(resume, jobsForOutreach);
      for (const msg of linkedinResults) {
        const job = highScoreJobs[msg.index];
        if (job) {
          service.createOutreach({
            userId,
            listingId: job.id,
            personName: msg.personName,
            personTitle: msg.personTitle,
            personUrl: msg.linkedinSearchUrl || null,
            company: job.company,
            message: msg.message,
            status: 'drafted',
          });
          linkedinGenerated++;
        }
      }
    }

    return successResponse({
      jobs: updatedJobs,
      searchSessionId: session.id,
      hasMore: searchResults.nextStartIndex !== null,
      totalResults: searchResults.totalResults,
      emailsGenerated,
      linkedinGenerated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function extractCompanyFromResult(item: { title: string; displayLink: string }): string {
  const parts = item.title.split(' - ');
  if (parts.length >= 2) return parts[parts.length - 1].trim();
  const pipe = item.title.split(' | ');
  if (pipe.length >= 2) return pipe[pipe.length - 1].trim();
  return item.displayLink;
}
