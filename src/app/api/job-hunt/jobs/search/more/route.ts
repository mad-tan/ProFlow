import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { searchGoogleJobs } from '@/lib/services/google-search';
import { scrapeJobPages } from '@/lib/services/job-scraper';
import { batchScoreJobs } from '@/lib/ai/batch-scorer';
import { getNow } from '@/lib/utils/dates';

export async function POST(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const userId = await getCurrentUserId();
    const resume = service.getResume(userId);

    if (!resume) {
      return errorResponse(new Error('No resume uploaded.'));
    }

    const body = await request.json();
    const { searchSessionId } = body;

    if (!searchSessionId) {
      return errorResponse(new Error('searchSessionId is required.'));
    }

    const session = service.getSearchSession(searchSessionId);

    if (session.nextStart <= 0) {
      return successResponse({ jobs: [], hasMore: false, totalResults: session.totalResults });
    }

    // Search next page
    const searchResults = await searchGoogleJobs(session.query, {
      location: session.location || undefined,
      dateAfter: session.dateFilter || undefined,
      start: session.nextStart,
    });

    if (searchResults.items.length === 0) {
      service.updateSearchSession(session.id, { nextStart: 0 });
      return successResponse({ jobs: [], hasMore: false, totalResults: session.totalResults });
    }

    // Update session pagination
    service.updateSearchSession(session.id, {
      nextStart: searchResults.nextStartIndex ?? 0,
    });

    // Scrape only pages without pre-extracted descriptions
    const urlsToScrape = searchResults.items
      .filter(item => !item.description)
      .map(item => item.link);

    const scraped = urlsToScrape.length > 0
      ? await scrapeJobPages(urlsToScrape)
      : new Map<string, null>();

    // Save jobs and collect for scoring
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

    // Batch score
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

    const updatedJobs = savedJobs.map(j => service.getJob(j.id));
    updatedJobs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return successResponse({
      jobs: updatedJobs,
      hasMore: searchResults.nextStartIndex !== null,
      totalResults: session.totalResults,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function extractCompanyFromResult(item: { title: string; displayLink: string }): string {
  const parts = item.title.split(' - ');
  if (parts.length >= 2) return parts[parts.length - 1].trim();
  const pipe = item.title.split(' | ');
  if (pipe.length >= 2) return pipe[pipe.length - 1].trim();
  return item.displayLink;
}
