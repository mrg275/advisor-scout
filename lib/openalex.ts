// OpenAlex client. Runs on the server only: it uses the secret API key, and it
// reshapes large responses before they reach the browser.
//
// Never log the request URL — it carries the api_key.

const BASE = "https://api.openalex.org";
const YEARS_BACK = 3;
const REVALIDATE_SECONDS = 60 * 60 * 24;

/** The API answered, but with no matches. Distinct from being unreachable. */
export type Empty = { kind: "empty" };
/** The API could not be reached, or answered with an error status. */
export class OpenAlexDownError extends Error {}

export type Paper = {
  workId: string;
  title: string;
  year: number | null;
  citedByCount: number;
  doi: string | null;
  venue: string | null;
  authors: string[];
};

export type Author = { authorId: string; name: string; paperCount: number };
export type Institution = { institutionId: string; name: string; paperCount: number };
export type Topic = { topicId: string; name: string; fieldId: string; fieldName: string };

function fromDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - YEARS_BACK);
  return d.toISOString().slice(0, 10);
}

async function oaFetch(path: string, params: Record<string, string>) {
  const key = process.env.OPENALEX_API_KEY;
  if (!key) throw new OpenAlexDownError("OPENALEX_API_KEY is not set");

  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", key);

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  } catch {
    // Do not include the url in the message: it holds the key.
    throw new OpenAlexDownError("Could not reach OpenAlex");
  }
  if (!res.ok) throw new OpenAlexDownError(`OpenAlex returned ${res.status}`);
  return res.json();
}

/**
 * Resolve what someone typed to an OpenAlex topic. Free-text search alone is
 * unusable here: it matches the words anywhere in full text, so "mechanistic
 * interpretability" returns cardiology guidelines. The topic gives us a field
 * to restrict to.
 */
export async function resolveTopic(query: string): Promise<Topic | null> {
  const data = await oaFetch("/topics", {
    search: query,
    per_page: "1",
    select: "id,display_name,field",
  });
  const t = data.results?.[0];
  if (!t) return null;
  return {
    topicId: t.id,
    name: t.display_name,
    fieldId: t.field.id,
    fieldName: t.field.display_name,
  };
}

function worksFilter(query: string, fieldId: string | null): string {
  const parts = [
    `from_publication_date:${fromDate()}`,
    `title_and_abstract.search:"${query.replace(/"/g, "")}"`,
  ];
  // fieldId arrives as a full URL; the filter wants the trailing path.
  if (fieldId) parts.push(`primary_topic.field.id:${fieldId.replace(`${"https://openalex.org/"}`, "")}`);
  return parts.join(",");
}

/** Normalised title, used to collapse preprint and published versions. */
function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function topPapers(query: string, fieldId: string | null, limit = 10): Promise<Paper[]> {
  const data = await oaFetch("/works", {
    filter: worksFilter(query, fieldId),
    sort: "cited_by_count:desc",
    per_page: String(limit * 2), // room to drop duplicates
    select: "id,doi,title,publication_year,cited_by_count,authorships,primary_location",
  });

  const seen = new Set<string>();
  const papers: Paper[] = [];
  for (const w of data.results ?? []) {
    if (!w.title) continue;
    // A preprint and its published version are separate records.
    const key = w.doi ?? titleKey(w.title);
    if (seen.has(key)) continue;
    seen.add(key);
    papers.push({
      workId: w.id,
      title: w.title,
      year: w.publication_year ?? null,
      citedByCount: w.cited_by_count ?? 0,
      doi: w.doi ?? null,
      venue: w.primary_location?.source?.display_name ?? null,
      authors: (w.authorships ?? []).slice(0, 4).map((a: any) => a.author?.display_name).filter(Boolean),
    });
    if (papers.length === limit) break;
  }
  return papers;
}

/**
 * OpenAlex returns conference bodies as authors — "Association for Computational
 * Linguistics 2026" outranks real researchers. Drop the obvious ones.
 */
function looksLikeOrganisation(name: string): boolean {
  return (
    /\b(19|20)\d{2}\b/.test(name) ||
    /^(the\s+)?(association|proceedings|conference|workshop|society|institute|committee|ieee|acm|springer|elsevier)\b/i.test(name)
  );
}

export async function topAuthors(query: string, fieldId: string | null, limit = 10): Promise<Author[]> {
  const data = await oaFetch("/works", {
    filter: worksFilter(query, fieldId),
    group_by: "authorships.author.id",
    per_page: String(limit * 3),
  });
  return (data.group_by ?? [])
    .filter((g: any) => g.key_display_name && !looksLikeOrganisation(g.key_display_name))
    .slice(0, limit)
    .map((g: any) => ({ authorId: g.key, name: g.key_display_name, paperCount: g.count }));
}

export async function topInstitutions(query: string, fieldId: string | null, limit = 10): Promise<Institution[]> {
  // .id, not .lineage: lineage rolls results up into parent organisations.
  const data = await oaFetch("/works", {
    filter: worksFilter(query, fieldId),
    group_by: "authorships.institutions.id",
    per_page: String(limit),
  });
  return (data.group_by ?? [])
    .filter((g: any) => g.key_display_name)
    .slice(0, limit)
    .map((g: any) => ({ institutionId: g.key, name: g.key_display_name, paperCount: g.count }));
}
