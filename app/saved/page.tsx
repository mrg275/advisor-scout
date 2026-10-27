import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import SiteHeader from "../site-header";
import { createUserScopedClient } from "@/lib/supabase";
import RemoveButton from "./remove-button";

export const instant = false;

export default async function SavedPage() {
  await auth.protect();

  const supabase = await createUserScopedClient();
  const [papersResult, authorsResult] = await Promise.all([
    supabase.from("favorite_papers").select("*").order("created_at", { ascending: false }),
    supabase.from("favorite_authors").select("*").order("created_at", { ascending: false }),
  ]);

  const unavailable = Boolean(papersResult.error || authorsResult.error);
  const papers = papersResult.data ?? [];
  const authors = authorsResult.data ?? [];
  const nothingSaved = !unavailable && papers.length === 0 && authors.length === 0;

  return (
    <>
      <SiteHeader current="saved" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12">
        <h1 className="font-serif text-3xl tracking-tight text-ink">Saved</h1>
        {!nothingSaved && !unavailable && (
          <p className="nums mt-2 text-sm text-muted">
            {papers.length} {papers.length === 1 ? "paper" : "papers"} ·{" "}
            {authors.length} {authors.length === 1 ? "author" : "authors"}
          </p>
        )}

        {unavailable && (
          <section className="mt-10 rounded-card border border-line bg-surface p-6">
            <h2 className="font-serif text-lg text-ink">Your saved work is unavailable</h2>
            <p className="mt-2 text-sm text-muted">
              We couldn’t reach the database. Nothing has been lost; please try again shortly.
            </p>
          </section>
        )}

        {nothingSaved && (
          <section className="mt-10 rounded-card border border-line bg-surface p-8">
            <h2 className="font-serif text-lg text-ink">Nothing saved yet</h2>
            <p className="mt-2 text-sm text-muted">
              Search a topic, then save the papers and authors worth returning to.
            </p>
            <Link
              href="/"
              className="motion mt-5 inline-block rounded-card bg-accent px-5 py-2.5 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Search a topic
            </Link>
          </section>
        )}

        <div className="mt-12 grid gap-x-14 gap-y-14 lg:grid-cols-[minmax(0,1fr)_16rem]">
          {papers.length > 0 && (
            <section aria-labelledby="saved-papers">
              <h2
                id="saved-papers"
                className="text-xs font-medium uppercase tracking-[0.08em] text-muted"
              >
                Papers
              </h2>
              <ul className="mt-5 space-y-7">
                {papers.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <h3 className="font-serif text-[1.0625rem] leading-snug text-ink">
                        {p.title}
                      </h3>
                      <p className="nums mt-1.5 text-sm text-muted">
                        {p.publication_year}
                        {p.venue ? ` · ${p.venue}` : ""} ·{" "}
                        {(p.cited_by_count ?? 0).toLocaleString()} citations
                      </p>
                    </div>
                    <RemoveButton kind="paper" id={p.work_id} label={p.title} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {authors.length > 0 && (
            <aside>
              <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                Authors
              </h2>
              <ul className="mt-4 space-y-3.5">
                {authors.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 font-serif text-[0.9375rem] leading-snug text-ink">
                      {a.display_name}
                    </span>
                    <RemoveButton kind="author" id={a.author_id} label={a.display_name} />
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}
