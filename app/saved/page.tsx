import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
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
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Advisor Scout</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-md px-2 py-1 font-medium text-teal-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Search
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">Saved</h2>

        {unavailable && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
            <h3 className="font-semibold">Your saved work is unavailable</h3>
            <p className="mt-1 text-stone-700">
              We couldn’t reach the database. Nothing has been lost; please try again shortly.
            </p>
          </div>
        )}

        {nothingSaved && (
          <div className="rounded-md border border-stone-300 bg-white p-6">
            <h3 className="font-semibold">Nothing saved yet</h3>
            <p className="mt-1 text-stone-700">
              Search for a topic, then save the papers and authors worth returning to.
            </p>
            <Link
              href="/"
              className="mt-3 inline-block rounded-md bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Search a topic
            </Link>
          </div>
        )}

        {papers.length > 0 && (
          <section className="mb-10">
            <h3 className="mb-2 text-base font-semibold">Papers</h3>
            <ul className="divide-y divide-stone-200">
              {papers.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="mt-1 text-sm text-stone-700">
                      {p.publication_year} · {p.cited_by_count} citations
                      {p.venue ? ` · ${p.venue}` : ""}
                    </p>
                  </div>
                  <RemoveButton kind="paper" id={p.work_id} label={p.title} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {authors.length > 0 && (
          <section>
            <h3 className="mb-2 text-base font-semibold">Authors</h3>
            <ul className="divide-y divide-stone-200">
              {authors.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="font-medium">{a.display_name}</span>
                  <RemoveButton kind="author" id={a.author_id} label={a.display_name} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
