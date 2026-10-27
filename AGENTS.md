# Advisor Scout

Research who to work with in an academic field. Someone types a topic, such as
"mechanistic interpretability", and sees three things for recent work from roughly the
last three years: the top papers, the top authors, and the top institutions. They can
favorite papers and authors, and come back to those favorites later on any device.

Built for Design, Build, Ship (MPCS 51238), Assignment 4.

## Stack

| Layer | Tool |
| --- | --- |
| Framework | Next.js 16, App Router, TypeScript |
| Styling | Tailwind CSS v4 |
| Accounts | Clerk |
| Database | Supabase, Postgres with row-level security |
| Paper data | OpenAlex |
| Hosting | Vercel |

Favorites are per person: every row carries the signed-in user's ID, and row-level
security keeps each person to their own rows, so favorites follow them across devices.

All of it is wired up: Clerk issues the session token, Supabase verifies it as a
third-party auth provider and enforces row-level security, and OpenAlex is called
server-side.

Clerk and Supabase must agree on the same Clerk instance. If Supabase trusts a
different instance than the app's keys belong to, every query fails with "No suitable
key or wrong key type", and the policies look broken when they are fine.

## Rules

- Every field has a visible label, every action is a real button, and text contrast
  meets WCAG AA.
- Check UI changes in the browser at 390px and 1440px before saying you're done.
- Never read, write, or print `.env` files. Ask me to add keys.

## Data Model

Two tables, both holding one person's data. `user_id` is **text**, not `uuid`, because
Clerk user IDs are not UUIDs. The `grant` is required: without it reads fail with
Postgres error `42501`.

```sql
create table favorite_papers (
  id bigint generated always as identity primary key,
  user_id text not null default (auth.jwt()->>'sub'),
  work_id text not null,              -- OpenAlex W-id
  title text not null,
  publication_year int,
  cited_by_count int,
  doi text,
  venue text,
  created_at timestamptz default now(),
  unique (user_id, work_id)
);

create table favorite_authors (
  id bigint generated always as identity primary key,
  user_id text not null default (auth.jwt()->>'sub'),
  author_id text not null,            -- OpenAlex A-id
  display_name text not null,
  institution text,
  created_at timestamptz default now(),
  unique (user_id, author_id)
);
```

Row-level security is enabled on both, with the same policy shape:

```sql
alter table favorite_papers enable row level security;
create policy "own rows" on favorite_papers for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
grant select, insert, update, delete on public.favorite_papers to authenticated;
```

Favorites store a **snapshot** of the paper or author, not just its OpenAlex ID. The
favorites page then costs nothing in API calls and stays fast. Institutions are display
only: no table, no favoriting.

## Search Flow

A topic search is four OpenAlex calls, about $0.004 total:

1. `/topics?search=<what they typed>` resolves the topic to an ID and a field.
2. `/works` filtered by date + phrase + field, sorted by `cited_by_count` — the papers.
3. The same filter with `group_by=authorships.author.id` — the authors.
4. The same filter with `group_by=authorships.institutions.id` — the institutions.

Date filter is `from_publication_date:` set to three years before today, computed per
request.

## What the Real API Responses Taught Us

These are settled decisions. Do not re-litigate them without new evidence.

- **Call OpenAlex from the server, never the browser.** The key must stay secret, the
  response needs reshaping (~150KB down to ~5KB), and caching centrally means cost is
  shared across everyone instead of paid per browser.
- **Plain `search=` is unusable.** It matches the words anywhere in full text, so
  "mechanistic interpretability" returns cardiology guidelines. Use
  `title_and_abstract.search` with the quoted phrase *and* a field restriction.
- **Three states come from three different signals.** Loading is UI. "Nothing found" is
  `meta.count === 0` on an **HTTP 200**. "API down" is a non-200 or a network error.
  Never branch "nothing found" off the status code.
- **Filter organization-authors.** Entities like "Association for Computational
  Linguistics 2026" are returned as authors and outrank real researchers.
- **Group institutions by `authorships.institutions.id`**, not `.lineage`, which rolls
  results up into parent organizations.
- **Dedupe works by DOI.** Preprint and published versions come back as separate rows.
- **`select=` prunes top-level fields only.** `authorships` returns whole, with every
  author, ORCID and raw affiliation string. Reshape on the server before responding.

## Flows

- **First visit:** land → search a topic → see papers, authors, institutions → favorite
  something → it is saved to the account.
- **Main task:** search a topic → scan the three lists → favorite what matters.
- **Coming back:** sign in on any device → favorites are there → search again.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
