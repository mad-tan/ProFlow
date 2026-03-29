/**
 * Recruiter discovery — finds recruiters/hiring managers at a company
 * using Google search for LinkedIn profiles and email pattern guessing.
 *
 * Strategies:
 * 1. SerpAPI / Google CSE (if configured) for LinkedIn profile search
 * 2. Direct Google HTML search fallback
 * 3. Hunter.io domain search (if HUNTER_API_KEY configured)
 * 4. Email pattern generation from name + company domain
 */

export interface DiscoveredRecruiter {
  name: string;
  title: string;
  linkedinUrl: string;
  email: string;
  source: "google" | "hunter" | "pattern";
}

/**
 * Guess common company email domains from company name.
 */
function guessCompanyDomain(company: string): string {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    + ".com";
}

/**
 * Generate likely email from name + domain using common patterns.
 */
function generateEmails(firstName: string, lastName: string, domain: string): string[] {
  const f = firstName.toLowerCase();
  const l = lastName.toLowerCase();
  return [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}@${domain}`,
  ];
}

/**
 * Search for recruiters using SerpAPI.
 */
async function searchWithSerpAPI(
  company: string,
  apiKey: string
): Promise<DiscoveredRecruiter[]> {
  const query = `site:linkedin.com/in "${company}" ("recruiter" OR "hiring manager" OR "talent acquisition" OR "technical recruiter" OR "people operations")`;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json();
    const organic = data.organic_results ?? [];
    return parseLinkedInResults(organic, company);
  } catch {
    return [];
  }
}

/**
 * Search for recruiters using Google Custom Search API.
 */
async function searchWithGoogleCSE(
  company: string,
  apiKey: string,
  cx: string
): Promise<DiscoveredRecruiter[]> {
  const query = `site:linkedin.com/in "${company}" recruiter OR "hiring manager" OR "talent acquisition"`;
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    return parseLinkedInResults(data.items ?? [], company);
  } catch {
    return [];
  }
}

/**
 * Search Hunter.io for emails at a company domain.
 */
async function searchWithHunter(
  company: string,
  domain: string,
  apiKey: string
): Promise<DiscoveredRecruiter[]> {
  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("domain", domain);
  url.searchParams.set("department", "hr");
  url.searchParams.set("limit", "10");

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    const emails = data.data?.emails ?? [];

    return emails
      .filter((e: Record<string, unknown>) => {
        const title = String(e.position ?? "").toLowerCase();
        return title.includes("recruit") || title.includes("hiring") || title.includes("talent") || title.includes("people") || title.includes("hr");
      })
      .map((e: Record<string, unknown>) => ({
        name: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "Unknown",
        title: String(e.position ?? "Recruiter"),
        linkedinUrl: String(e.linkedin ?? ""),
        email: String(e.value ?? ""),
        source: "hunter" as const,
      }));
  } catch {
    return [];
  }
}

/**
 * Parse Google/SerpAPI search results to extract LinkedIn profiles.
 */
function parseLinkedInResults(
  results: Array<Record<string, unknown>>,
  company: string
): DiscoveredRecruiter[] {
  const domain = guessCompanyDomain(company);
  const recruiters: DiscoveredRecruiter[] = [];

  for (const result of results) {
    const link = String(result.link ?? result.url ?? "");
    const title = String(result.title ?? "");
    const snippet = String(result.snippet ?? "");

    // Only LinkedIn profile URLs
    if (!link.includes("linkedin.com/in/")) continue;

    // Extract name from title (format: "Name - Title - Company | LinkedIn")
    const nameParts = title.split(" - ");
    const name = nameParts[0]?.replace(/ \|.*$/, "").trim() || "Unknown";
    const role = nameParts[1]?.trim() || extractRoleFromSnippet(snippet);

    // Skip if name doesn't look like a person
    if (name.length < 3 || name.includes("LinkedIn")) continue;

    // Generate email from name
    const nameWords = name.split(/\s+/);
    const firstName = nameWords[0] ?? "";
    const lastName = nameWords[nameWords.length - 1] ?? "";
    const emails = generateEmails(firstName, lastName, domain);

    recruiters.push({
      name,
      title: role || "Recruiter",
      linkedinUrl: link.split("?")[0], // Remove tracking params
      email: emails[0], // Best guess: first.last@company.com
      source: "google",
    });
  }

  return recruiters;
}

function extractRoleFromSnippet(snippet: string): string {
  const patterns = [
    /(?:recruiter|recruiting|talent acquisition|hiring manager|people operations|hr |human resources)/i,
  ];
  for (const p of patterns) {
    const match = snippet.match(p);
    if (match) {
      // Try to extract a more complete title around the match
      const idx = snippet.toLowerCase().indexOf(match[0].toLowerCase());
      const before = snippet.substring(Math.max(0, idx - 30), idx);
      const titleStart = before.lastIndexOf("·");
      if (titleStart >= 0) {
        return before.substring(titleStart + 1).trim() + match[0];
      }
      return match[0].charAt(0).toUpperCase() + match[0].slice(1);
    }
  }
  return "Recruiter";
}

/**
 * Main function: discover recruiters at a company.
 * Uses available APIs in order of preference.
 */
export async function discoverRecruiters(
  company: string,
  companyDomain?: string
): Promise<DiscoveredRecruiter[]> {
  const domain = companyDomain || guessCompanyDomain(company);
  const allRecruiters: DiscoveredRecruiter[] = [];

  console.log(`[recruiter-finder] Searching for recruiters at ${company} (${domain})`);

  // Strategy 1: Hunter.io (best for emails)
  const hunterKey = process.env.HUNTER_API_KEY;
  if (hunterKey) {
    const hunterResults = await searchWithHunter(company, domain, hunterKey);
    allRecruiters.push(...hunterResults);
    console.log(`[recruiter-finder] Hunter.io: found ${hunterResults.length}`);
  }

  // Strategy 2: Google CSE
  const cseKey = process.env.GOOGLE_CSE_API_KEY;
  const cseCx = process.env.GOOGLE_CSE_CX;
  if (cseKey && cseCx) {
    const cseResults = await searchWithGoogleCSE(company, cseKey, cseCx);
    allRecruiters.push(...cseResults);
    console.log(`[recruiter-finder] Google CSE: found ${cseResults.length}`);
  }

  // Strategy 3: SerpAPI
  const serpKey = process.env.SERP_API_KEY;
  if (serpKey) {
    const serpResults = await searchWithSerpAPI(company, serpKey);
    allRecruiters.push(...serpResults);
    console.log(`[recruiter-finder] SerpAPI: found ${serpResults.length}`);
  }

  // Strategy 4: Pattern-based fallback (always works)
  if (allRecruiters.length === 0) {
    console.log(`[recruiter-finder] No API keys configured, generating pattern-based contacts`);
    allRecruiters.push(
      {
        name: "Recruiting Team",
        title: "Talent Acquisition",
        linkedinUrl: `https://www.linkedin.com/company/${company.toLowerCase().replace(/[^a-z0-9]/g, "")}/people/?keywords=recruiter`,
        email: `recruiting@${domain}`,
        source: "pattern",
      },
      {
        name: "Hiring Team",
        title: "People Operations",
        linkedinUrl: `https://www.linkedin.com/company/${company.toLowerCase().replace(/[^a-z0-9]/g, "")}/people/?keywords=hiring%20manager`,
        email: `careers@${domain}`,
        source: "pattern",
      },
      {
        name: "HR Department",
        title: "Human Resources",
        linkedinUrl: `https://www.linkedin.com/company/${company.toLowerCase().replace(/[^a-z0-9]/g, "")}/people/?keywords=talent%20acquisition`,
        email: `hr@${domain}`,
        source: "pattern",
      },
      {
        name: "General Inquiries",
        title: "Talent",
        linkedinUrl: `https://www.linkedin.com/company/${company.toLowerCase().replace(/[^a-z0-9]/g, "")}/people/`,
        email: `jobs@${domain}`,
        source: "pattern",
      }
    );
  }

  // Deduplicate by email
  const seen = new Set<string>();
  const unique = allRecruiters.filter(r => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[recruiter-finder] Total unique: ${unique.length}`);
  return unique;
}
