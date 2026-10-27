"use client";

import { useEffect, useState, type FormEvent } from "react";
import SaveButton from "./save-button";

type Paper = {
  workId: string;
  title: string;
  year: number | null;
  citedByCount: number;
  doi: string | null;
  venue: string | null;
  authors: string[];
};
type Author = { authorId: string; name: string; paperCount: number };
type Institution = { institutionId: string; name: string; paperCount: number };
type Topic = { topicId: string; name: string; fieldName: string };

type Results = {
  query: string;
  topic: Topic | null;
  papers: Paper[];
  authors: Author[];
  institutions: Institution[];
};

type Status = "idle" | "loading" | "ready" | "unavailable";

export default function SearchClient() {
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<Results | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [savedPapers, setSavedPapers] = useState<Set<string>>(new Set());
  const [savedAuthors, setSavedAuthors] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  // What is already saved, so the buttons show the right state on arrival.
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/favorites");
        if (!res.ok) return;
        const data = await res.json();
        setSavedPapers(new Set((data.papers ?? []).map((p: { work_id: string }) => p.work_id)));
        setSavedAuthors(new Set((data.authors ?? []).map((a: { author_id: string }) => a.author_id)));
      } catch {
        // Saved state is a convenience; searching still works without it.
      }
    })();
  }, []);

  async function togglePaper(paper: Paper) {
    const isSaved = savedPapers.has(paper.workId);
    const next = new Set(savedPapers);
    // Only show it as saved if the server accepted it. Updating the button
    // regardless would tell someone their work is stored when it is not.
    const res = isSaved
      ? await fetch(`/api/favorites?kind=paper&id=${encodeURIComponent(paper.workId)}`, { method: "DELETE" })
      : await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "paper", ...paper }),
        });
    if (!res.ok) {
      setSaveError("We couldn't save that. Please try again.");
      return;
    }
    setSaveError(null);
    if (isSaved) next.delete(paper.workId);
    else next.add(paper.workId);
    setSavedPapers(next);
  }

  async function toggleAuthor(author: Author) {
    const isSaved = savedAuthors.has(author.authorId);
    const next = new Set(savedAuthors);
    const res = isSaved
      ? await fetch(`/api/favorites?kind=author&id=${encodeURIComponent(author.authorId)}`, { method: "DELETE" })
      : await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "author", ...author }),
        });
    if (!res.ok) {
      setSaveError("We couldn't save that. Please try again.");
      return;
    }
    setSaveError(null);
    if (isSaved) next.delete(author.authorId);
    else next.add(author.authorId);
    setSavedAuthors(next);
  }

  async function runSearch(query: string) {
    setStatus("loading");
    setLastQuery(query);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setStatus("unavailable");
        return;
      }
      setResults(await res.json());
      setStatus("ready");
    } catch {
      setStatus("unavailable");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = topic.trim();
    if (query) void runSearch(query);
  }

  const foundNothing = status === "ready" && results?.topic === null;

  return (
    <div>
      <form onSubmit={onSubmit} className="mb-8">
        <label htmlFor="topic" className="block text-sm font-medium text-stone-700">
          Research topic
        </label>
        <p id="topic-hint" className="mt-1 text-sm text-stone-600">
          Work published in the last three years, by citations.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="topic"
            name="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-describedby="topic-hint"
            placeholder="mechanistic interpretability"
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          />
          <button
            type="submit"
            disabled={status === "loading" || topic.trim() === ""}
            className="rounded-md bg-teal-800 px-5 py-2 font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50 sm:w-auto"
          >
            {status === "loading" ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {saveError && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-stone-900"
        >
          {saveError}
        </div>
      )}

      <div aria-live="polite">
        {status === "loading" && (
          <p className="text-stone-700">Searching for “{lastQuery}”…</p>
        )}

        {status === "unavailable" && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
            <h2 className="font-semibold text-stone-900">Search is unavailable</h2>
            <p className="mt-1 text-stone-700">
              We couldn’t reach the paper database. Your saved work is unaffected.
            </p>
            <button
              type="button"
              onClick={() => void runSearch(lastQuery)}
              className="mt-3 rounded-md border border-stone-400 bg-white px-4 py-2 font-medium text-stone-900 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Try again
            </button>
          </div>
        )}

        {foundNothing && (
          <div className="rounded-md border border-stone-300 bg-white p-6">
            <h2 className="font-semibold">No field matches “{lastQuery}”</h2>
            <p className="mt-1 text-stone-700">
              Try a broader subject, like “machine learning” or “climate modelling”.
            </p>
          </div>
        )}

        {status === "ready" && results && results.topic && (
          <div className="space-y-10">
            <p className="text-sm text-stone-700">
              Matched to <strong className="font-semibold">{results.topic.name}</strong> in{" "}
              {results.topic.fieldName}.
            </p>

            <Section title="Top papers">
              <ul className="divide-y divide-stone-200">
                {results.papers.map((p) => (
                  <li key={p.workId} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="mt-1 text-sm text-stone-700">
                        {p.authors.join(", ")}
                        {p.authors.length > 0 && " · "}
                        {p.year} · {p.citedByCount} citations
                        {p.venue ? ` · ${p.venue}` : ""}
                      </p>
                    </div>
                    <SaveButton
                      saved={savedPapers.has(p.workId)}
                      label={p.title}
                      onToggle={() => togglePaper(p)}
                    />
                  </li>
                ))}
              </ul>
            </Section>

            <div className="grid gap-10 sm:grid-cols-2">
              <Section title="Top authors">
                <ul className="divide-y divide-stone-200">
                  {results.authors.map((a) => (
                    <li key={a.authorId} className="flex items-center justify-between gap-3 py-2">
                      <span>{a.name}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-sm text-stone-700">{a.paperCount} papers</span>
                        <SaveButton
                          saved={savedAuthors.has(a.authorId)}
                          label={a.name}
                          onToggle={() => toggleAuthor(a)}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Top institutions">
                <ul className="divide-y divide-stone-200">
                  {results.institutions.map((i) => (
                    <li key={i.institutionId} className="flex justify-between gap-3 py-2">
                      <span>{i.name}</span>
                      <span className="shrink-0 text-sm text-stone-700">
                        {i.paperCount} papers
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
