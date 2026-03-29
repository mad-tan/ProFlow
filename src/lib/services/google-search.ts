/**
 * Job search using multiple strategies:
 * 1. Google Custom Search API (if GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX configured)
 * 2. Direct job board APIs (Greenhouse, Ashby — always free, no key needed)
 * 3. SerpAPI (if SERP_API_KEY configured — 100 free searches/month)
 */

const JOB_BOARD_SITES = [
  "jobs.ashbyhq.com",
  "boards.greenhouse.io",
  "jobs.lever.co",
  "apply.workable.com",
  "breezy.hr",
  "recruitee.com",
  "wd5.myworkdayjobs.com",
  "icims.com/jobs",
  "taleo.net",
  "smartrecruiters.com",
  "jazzhr.com",
  "jobvite.com",
];

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  /** Pre-extracted company name (from board API) */
  company?: string;
  /** Pre-extracted description (from board API, avoids needing to scrape) */
  description?: string;
  /** Pre-extracted location */
  location?: string;
}

export interface GoogleSearchResponse {
  items: GoogleSearchResult[];
  totalResults: number;
  nextStartIndex: number | null;
}

// ─── Well-known companies on each board (curated for software jobs) ─────────

const GREENHOUSE_BOARDS = [
  // Big tech & unicorns
  "discord", "figma", "airbnb", "airtable", "brex", "lyft",
  "coinbase", "databricks", "duolingo", "flexport", "robinhood",
  "gusto", "instacart", "reddit", "stripe", "twitch", "dropbox",
  // Cloud & infra
  "cloudflare", "gitlab", "datadog", "pagerduty", "elastic",
  "mongodb", "cockroachlabs", "netlify", "contentful", "zscaler", "okta",
  // SaaS & platforms
  "hubspot", "squarespace", "asana", "postman", "block", "toast",
  "samsara", "lattice", "twilio", "roblox", "epicgames",
];

const ASHBY_BOARDS = [
  // AI & frontier
  "ramp", "cursor", "replit", "modal",
  // Dev tools & infra
  "notion", "linear", "vercel", "supabase", "mercury",
  "resend", "railway", "clerk", "neon", "temporal",
  "coder", "mintlify", "inngest", "axiom",
  // Other
  "loom", "ashby", "stytch",
];

// ─── Google CSE API ─────────────────────────────────────────────────────────

function buildSiteFilter(): string {
  return JOB_BOARD_SITES.map(s => `site:${s}`).join(" OR ");
}

function buildSearchQuery(query: string, location?: string, dateAfter?: string): string {
  const siteFilter = `(${buildSiteFilter()})`;
  let q = `${siteFilter} "${query}"`;
  if (location) q += ` "${location}"`;
  if (dateAfter) q += ` after:${dateAfter}`;
  return q;
}

async function searchWithAPI(
  query: string,
  start: number = 1,
  apiKey: string,
  cx: string
): Promise<GoogleSearchResponse> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("start", String(start));
  url.searchParams.set("num", "10");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[google-search] CSE API error ${res.status}: ${body.substring(0, 200)}`);
    return { items: [], totalResults: 0, nextStartIndex: null };
  }

  const data = await res.json();
  const items: GoogleSearchResult[] = (data.items ?? []).map((item: Record<string, string>) => ({
    title: item.title ?? "",
    link: item.link ?? "",
    snippet: item.snippet ?? "",
    displayLink: item.displayLink ?? "",
  }));

  const totalResults = parseInt(data.searchInformation?.totalResults ?? "0", 10);
  const nextPage = data.queries?.nextPage?.[0];
  const nextStartIndex = nextPage ? parseInt(nextPage.startIndex, 10) : null;

  return { items, totalResults, nextStartIndex };
}

// ─── SerpAPI (optional) ─────────────────────────────────────────────────────

async function searchWithSerpAPI(
  query: string,
  location?: string,
  start: number = 0,
  apiKey: string
): Promise<GoogleSearchResponse> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("start", String(start));
  url.searchParams.set("num", "10");
  if (location) url.searchParams.set("location", location);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    console.error(`[google-search] SerpAPI error: ${res.status}`);
    return { items: [], totalResults: 0, nextStartIndex: null };
  }

  const data = await res.json();
  const organic = data.organic_results ?? [];
  const items: GoogleSearchResult[] = organic.map((r: Record<string, string>) => ({
    title: r.title ?? "",
    link: r.link ?? "",
    snippet: r.snippet ?? "",
    displayLink: new URL(r.link ?? "https://unknown").hostname,
  }));

  const totalResults = parseInt(data.search_information?.total_results ?? "0", 10);
  const hasNext = organic.length >= 10;

  return { items, totalResults, nextStartIndex: hasNext ? start + 10 : null };
}

// ─── Direct Job Board APIs (always free) ────────────────────────────────────

interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  absolute_url: string;
  content?: string;
  updated_at: string;
  departments: { name: string }[];
}

interface AshbyJob {
  id: string;
  title: string;
  location: string;
  department: string;
  team: string;
  jobUrl: string;
  descriptionPlain?: string;
  publishedAt: string;
  isRemote: boolean;
  employmentType: string;
}

function matchesQuery(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  // Require ALL keywords to match (AND logic)
  return keywords.every(kw => lower.includes(kw));
}

async function searchGreenhouseBoard(
  board: string,
  keywords: string[],
  location?: string
): Promise<GoogleSearchResult[]> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const jobs: GreenhouseJob[] = data.jobs ?? [];

    // Score jobs: title match = 2pts, description match = 1pt
    const scored = jobs
      .map(j => {
        const titleText = j.title.toLowerCase();
        const fullText = `${j.title} ${j.content ?? ""} ${j.departments?.map(d => d.name).join(" ") ?? ""}`.toLowerCase();
        const titleMatch = keywords.every(kw => titleText.includes(kw));
        const fullMatch = keywords.every(kw => fullText.includes(kw));
        const matchesLoc = !location || matchesQuery(j.location?.name ?? "", location.toLowerCase().split(/\s+/));
        const score = titleMatch ? 2 : fullMatch ? 1 : 0;
        return { job: j, score, matchesLoc };
      })
      .filter(s => s.score > 0 && s.matchesLoc)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const boardName = board.charAt(0).toUpperCase() + board.slice(1);
    return scored.map(({ job: j }) => ({
      title: j.title,
      link: j.absolute_url,
      snippet: (j.content ?? "").replace(/<[^>]*>/g, "").substring(0, 200),
      displayLink: "boards.greenhouse.io",
      company: boardName,
      description: (j.content ?? "").replace(/<[^>]*>/g, "").substring(0, 2000),
      location: j.location?.name ?? "",
    }));
  } catch {
    return [];
  }
}

async function searchAshbyBoard(
  board: string,
  keywords: string[],
  location?: string
): Promise<GoogleSearchResult[]> {
  try {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${board}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const jobs: AshbyJob[] = data.jobs ?? [];

    const scored = jobs
      .map(j => {
        const titleText = j.title.toLowerCase();
        const fullText = `${j.title} ${j.department ?? ""} ${j.team ?? ""} ${j.descriptionPlain ?? ""}`.toLowerCase();
        const titleMatch = keywords.every(kw => titleText.includes(kw));
        const fullMatch = keywords.every(kw => fullText.includes(kw));
        const matchesLoc = !location || matchesQuery(`${j.location ?? ""} ${j.isRemote ? "remote" : ""}`, location.toLowerCase().split(/\s+/));
        const score = titleMatch ? 2 : fullMatch ? 1 : 0;
        return { job: j, score, matchesLoc };
      })
      .filter(s => s.score > 0 && s.matchesLoc)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const boardName = board.charAt(0).toUpperCase() + board.slice(1);
    return scored.map(({ job: j }) => ({
      title: j.title,
      link: j.jobUrl,
      snippet: (j.descriptionPlain ?? "").substring(0, 200),
      displayLink: "jobs.ashbyhq.com",
      company: boardName,
      description: (j.descriptionPlain ?? "").substring(0, 2000),
      location: j.location ?? (j.isRemote ? "Remote" : ""),
    }));
  } catch {
    return [];
  }
}

async function searchJobBoardsDirect(
  query: string,
  location?: string,
  offset: number = 0,
  limit: number = 15
): Promise<GoogleSearchResponse> {
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  console.log(`[job-boards] Searching ${GREENHOUSE_BOARDS.length} Greenhouse + ${ASHBY_BOARDS.length} Ashby boards for: ${keywords.join(", ")}`);

  // Search boards in parallel batches of 10 to avoid overwhelming
  const BATCH_SIZE = 10;
  const allResults: GoogleSearchResult[] = [];

  // Interleave Greenhouse and Ashby boards
  const allBoards: { type: "greenhouse" | "ashby"; slug: string }[] = [];
  const maxLen = Math.max(GREENHOUSE_BOARDS.length, ASHBY_BOARDS.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < GREENHOUSE_BOARDS.length) allBoards.push({ type: "greenhouse", slug: GREENHOUSE_BOARDS[i] });
    if (i < ASHBY_BOARDS.length) allBoards.push({ type: "ashby", slug: ASHBY_BOARDS[i] });
  }

  for (let i = 0; i < allBoards.length; i += BATCH_SIZE) {
    const batch = allBoards.slice(i, i + BATCH_SIZE);
    const promises = batch.map(b =>
      b.type === "greenhouse"
        ? searchGreenhouseBoard(b.slug, keywords, location)
        : searchAshbyBoard(b.slug, keywords, location)
    );
    const batchResults = await Promise.all(promises);
    for (const results of batchResults) {
      allResults.push(...results);
    }

    // If we have enough results, stop early
    if (allResults.length >= offset + limit + 10) break;
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter(r => {
    if (seen.has(r.link)) return false;
    seen.add(r.link);
    return true;
  });

  const page = unique.slice(offset, offset + limit);
  const hasMore = unique.length > offset + limit;

  console.log(`[job-boards] Found ${unique.length} total jobs, returning ${page.length} (offset=${offset})`);

  return {
    items: page,
    totalResults: unique.length,
    nextStartIndex: hasMore ? offset + limit : null,
  };
}

// ─── Main Search Function ───────────────────────────────────────────────────

export async function searchGoogleJobs(
  query: string,
  options: {
    location?: string;
    dateAfter?: string;
    start?: number;
  } = {}
): Promise<GoogleSearchResponse> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  const serpApiKey = process.env.SERP_API_KEY;

  // Strategy 1: Google CSE API
  if (apiKey && cx) {
    const fullQuery = buildSearchQuery(query, options.location, options.dateAfter);
    console.log(`[google-search] Using CSE API: ${fullQuery.substring(0, 100)}...`);
    const results = await searchWithAPI(fullQuery, options.start ?? 1, apiKey, cx);
    if (results.items.length > 0) return results;
    // Fall through to other strategies
  }

  // Strategy 2: SerpAPI
  if (serpApiKey) {
    const fullQuery = buildSearchQuery(query, options.location, options.dateAfter);
    console.log(`[google-search] Using SerpAPI: ${fullQuery.substring(0, 100)}...`);
    const results = await searchWithSerpAPI(fullQuery, options.location, options.start ?? 0, serpApiKey);
    if (results.items.length > 0) return results;
  }

  // Strategy 3: Direct job board APIs (always works, no key needed)
  console.log(`[google-search] Using direct job board APIs for: "${query}"`);
  return searchJobBoardsDirect(query, options.location, options.start ?? 0);
}

export { JOB_BOARD_SITES };
