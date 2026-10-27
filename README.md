# Advisor Scout

Find who to work with in an academic field. Type a topic, such as
"mechanistic interpretability", and see the top papers, authors, and
institutions for work from the last three years. Save the papers and authors
worth returning to; they follow you to any device you sign in on.

Built for Design, Build, Ship (MPCS 51238), Assignment 4.

## Stack

- **Next.js 16** (App Router, TypeScript) and **Tailwind CSS v4**
- **Clerk** for accounts
- **Supabase** (Postgres) for saved work, with row-level security
- **OpenAlex** for paper, author, and institution data
- **Vercel** for hosting

## Running it

```bash
npm install
npm run dev
```

`.env.local` needs these. It is never committed, and the agent working on this
project is denied read access to it by `.claude/settings.json`:

```
OPENALEX_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Apply `supabase/migrations/0001_favorites.sql` to your Supabase project, and
connect Clerk under Authentication → Sign In / Providers.

## Testing

```bash
npm test
```

One Playwright test signs up two people, has one save a paper, and checks the
other sees an empty shelf and an empty API response. It was watched failing
with row-level security disabled before it passed with it on.

## How it works

### Where access is decided

In three places, each backing up the one before it:

1. **Clerk** establishes who you are and issues a signed token.
2. **Each page and route handler** checks for a user itself. Middleware is
   deliberately not the gate: Clerk deprecates route matching there because
   path matching can diverge from how Next.js routes requests and leave a
   resource reachable.
3. **Row-level security** is the backstop. Every query runs as the signed-in
   person, and Postgres compares the token's `sub` claim against `user_id`.
   The app never filters by `user_id` itself, so a bug in the app cannot show
   one person another person's rows.

### Where the API call happens

On the server, for three reasons: the OpenAlex key stays secret; a response is
reshaped from roughly 150KB to 5KB before it reaches the browser; and the
result is cached once for everyone rather than re-fetched per visitor.

### What the real API responses changed

Calling OpenAlex before building settled several things:

- Plain `search=` matches the words anywhere in full text, so "mechanistic
  interpretability" returned cardiology guidelines. Searches now resolve the
  typed topic through `/topics` first and restrict works to that field.
- Resolving the topic first also means a nonsense query costs one API call
  instead of four.
- OpenAlex returns conference bodies as authors; "Association for
  Computational Linguistics 2026" outranked real researchers, so they are
  filtered out.
- Institutions group by `authorships.institutions.id`, not `.lineage`, which
  rolls results up into parent organisations.
- Preprint and published versions arrive as separate records, so they are
  collapsed.
- A search that finds nothing is an HTTP 200 with `count: 0`, not an error, so
  "nothing found" and "the API is down" are different states in the UI.

### Cost

OpenAlex meters per request. A search is four calls, about $0.004, against a
free key's $1/day. Responses are cached for a day to keep that budget for
real searches.
