-- Advisor Scout: the two tables that hold a person's saved work.
--
-- user_id is text, not uuid, because Clerk user IDs are not UUIDs. It defaults
-- to the 'sub' claim of the Clerk token Supabase receives, so a row records
-- its owner without the client being trusted to say who that is.

create table if not exists favorite_papers (
  id bigint generated always as identity primary key,
  user_id text not null default (auth.jwt() ->> 'sub'),
  work_id text not null,
  title text not null,
  publication_year int,
  cited_by_count int,
  doi text,
  venue text,
  created_at timestamptz not null default now(),
  unique (user_id, work_id)
);

create table if not exists favorite_authors (
  id bigint generated always as identity primary key,
  user_id text not null default (auth.jwt() ->> 'sub'),
  author_id text not null,
  display_name text not null,
  institution text,
  created_at timestamptz not null default now(),
  unique (user_id, author_id)
);

alter table favorite_papers enable row level security;
alter table favorite_authors enable row level security;

-- using  : which existing rows this person may see or change.
-- with check: what they are allowed to write, so nobody can insert a row
--             owned by someone else.
create policy "People read and write only their own papers"
  on favorite_papers for all to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "People read and write only their own authors"
  on favorite_authors for all to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

-- Without this grant, reads fail with Postgres error 42501 even when the
-- policy would allow them.
grant select, insert, update, delete on public.favorite_papers to authenticated;
grant select, insert, update, delete on public.favorite_authors to authenticated;
