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

Only Next.js and Tailwind are installed so far. Clerk, Supabase, and OpenAlex are the
intended stack, not yet wired up.

## Rules

- Every field has a visible label, every action is a real button, and text contrast
  meets WCAG AA.
- Check UI changes in the browser at 390px and 1440px before saying you're done.
- Never read, write, or print `.env` files. Ask me to add keys.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
