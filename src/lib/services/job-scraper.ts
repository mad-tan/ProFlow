/**
 * Job page scraper using cheerio. Zero AI calls.
 * Extracts job details from job board URLs.
 */

export interface ScrapedJobData {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salaryRange: string | null;
  jobType: string | null;
}

const TIMEOUT = 8000;
const MAX_CONCURRENT = 5;

/**
 * Scrape a single job page.
 */
export async function scrapeJobPage(url: string): Promise<ScrapedJobData | null> {
  try {
    const { load } = await import("cheerio");
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (!res.ok) return null;
    const html = await res.text();
    const $ = load(html);

    // 1. Try JSON-LD (most reliable)
    const jsonLd = tryJsonLD($);
    if (jsonLd) return jsonLd;

    // 2. Board-specific selectors
    const boardSpecific = tryBoardSpecific($, url);
    if (boardSpecific) return boardSpecific;

    // 3. Generic fallback
    return tryGeneric($, url);
  } catch (err) {
    console.error(`[scraper] Failed to scrape ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function tryJsonLD($: ReturnType<typeof import("cheerio").load>): ScrapedJobData | null {
  let result: ScrapedJobData | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (result) return;
    try {
      const raw = $(el).html();
      if (!raw) return;
      const data = JSON.parse(raw);
      const job = data["@type"] === "JobPosting" ? data : null;
      if (!job) return;

      result = {
        title: job.title ?? "",
        company: typeof job.hiringOrganization === "object" ? job.hiringOrganization?.name ?? "" : String(job.hiringOrganization ?? ""),
        location: extractJsonLDLocation(job),
        description: stripHtml(job.description ?? ""),
        requirements: extractRequirements(job.description ?? ""),
        salaryRange: extractJsonLDSalary(job),
        jobType: job.employmentType ? (Array.isArray(job.employmentType) ? job.employmentType.join(", ") : String(job.employmentType)) : null,
      };
    } catch {}
  });

  return result;
}

function extractJsonLDLocation(job: Record<string, unknown>): string {
  const loc = job.jobLocation;
  if (!loc) return "";
  if (Array.isArray(loc)) {
    return loc.map(l => {
      const addr = l?.address;
      if (typeof addr === "object" && addr) return [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ");
      return String(l?.name ?? "");
    }).filter(Boolean).join("; ");
  }
  if (typeof loc === "object") {
    const addr = (loc as Record<string, unknown>).address as Record<string, string> | undefined;
    if (addr) return [addr.addressLocality, addr.addressRegion].filter(Boolean).join(", ");
  }
  return "";
}

function extractJsonLDSalary(job: Record<string, unknown>): string | null {
  const salary = job.baseSalary as Record<string, unknown> | undefined;
  if (!salary) return null;
  const value = salary.value as Record<string, unknown> | undefined;
  if (value && value.minValue && value.maxValue) {
    const currency = salary.currency ?? "USD";
    return `${currency} ${value.minValue}-${value.maxValue}`;
  }
  return null;
}

function tryBoardSpecific($: ReturnType<typeof import("cheerio").load>, url: string): ScrapedJobData | null {
  const hostname = new URL(url).hostname;

  if (hostname.includes("greenhouse.io")) {
    const title = $(".app-title").text().trim() || $("h1").first().text().trim();
    const company = $(".company-name").text().trim() || extractCompanyFromUrl(url);
    const location = $(".location").text().trim();
    const description = stripHtml($("#content").html() ?? $(".content").html() ?? "");
    if (title) return { title, company, location, description, requirements: extractRequirements(description), salaryRange: null, jobType: null };
  }

  if (hostname.includes("lever.co")) {
    const title = $(".posting-headline h2").text().trim();
    const company = $(".posting-headline .company").text().trim() || extractCompanyFromUrl(url);
    const location = $(".posting-categories .location").text().trim();
    const description = stripHtml($(".section-wrapper .content").html() ?? "");
    if (title) return { title, company, location, description, requirements: extractRequirements(description), salaryRange: null, jobType: null };
  }

  if (hostname.includes("ashbyhq.com")) {
    const title = $("h1").first().text().trim();
    const company = $('[data-testid="company-name"]').text().trim() || extractCompanyFromUrl(url);
    const location = $('[data-testid="job-location"]').text().trim() || $(".ashby-job-posting-location").text().trim();
    const description = stripHtml($('[data-testid="job-description"]').html() ?? $(".ashby-job-posting-description").html() ?? "");
    if (title) return { title, company, location, description, requirements: extractRequirements(description), salaryRange: null, jobType: null };
  }

  if (hostname.includes("workable.com")) {
    const title = $("h1").first().text().trim();
    const company = $('[data-ui="company-name"]').text().trim() || extractCompanyFromUrl(url);
    const location = $('[data-ui="job-location"]').text().trim();
    const description = stripHtml($('[data-ui="job-description"]').html() ?? "");
    if (title) return { title, company, location, description, requirements: extractRequirements(description), salaryRange: null, jobType: null };
  }

  return null;
}

function tryGeneric($: ReturnType<typeof import("cheerio").load>, url: string): ScrapedJobData | null {
  const title = $("h1").first().text().trim() || $("title").text().trim().split("|")[0].split("-")[0].trim();
  if (!title) return null;

  const company = $('meta[property="og:site_name"]').attr("content") ?? extractCompanyFromUrl(url);
  const description = stripHtml($("main").html() ?? $("article").html() ?? $("body").html() ?? "").substring(0, 5000);

  return {
    title,
    company,
    location: "",
    description,
    requirements: extractRequirements(description),
    salaryRange: null,
    jobType: null,
  };
}

function extractCompanyFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      return parts[0].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }
  } catch {}
  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|li|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractRequirements(text: string): string[] {
  const reqs: string[] = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let inReqSection = false;

  for (const line of lines) {
    if (/requirements|qualifications|what you.+need|must have|you.+have/i.test(line)) {
      inReqSection = true;
      continue;
    }
    if (inReqSection) {
      if (/^(responsibilities|about|benefits|perks|what we offer|nice to have)/i.test(line)) break;
      const cleaned = line.replace(/^[-•*]\s*/, "").trim();
      if (cleaned.length > 10 && cleaned.length < 300) {
        reqs.push(cleaned);
      }
    }
  }

  return reqs.slice(0, 15);
}

/**
 * Scrape multiple job pages in parallel with concurrency limit.
 */
export async function scrapeJobPages(urls: string[]): Promise<Map<string, ScrapedJobData | null>> {
  const results = new Map<string, ScrapedJobData | null>();
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift()!;
      results.set(url, await scrapeJobPage(url));
    }
  }

  const workers = Array.from({ length: Math.min(MAX_CONCURRENT, urls.length) }, () => worker());
  await Promise.all(workers);

  return results;
}
