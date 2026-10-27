"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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

// Nobody should meet an empty screen. These give a first visit something to
// do in one tap, and they teach the shape of a good query by example.
const EXAMPLES = [
  "mechanistic interpretability",
  "CRISPR gene editing",
  "urban heat islands",
  "protein structure prediction",
];

export default function SearchClient() {
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<Results | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [savedPapers, setSavedPapers] = useState<Set<string>>(new Set());
  const [savedAuthors, setSavedAuthors] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastVisited, setLastVisited] = useState<string | null>(null);

  // Coming back should be faster than the first visit.
  useEffect(() => {
    try {
      setLastVisited(window.localStorage.getItem("advisor-scout:last-topic"));
    } catch {
      // Private browsing, or storage blocked. The examples still work.
    }
  }, []);

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

  async function runSearch(query: string) {
    setStatus("loading");
    setLastQuery(query);
    setTopic(query);
    try {
      window.localStorage.setItem("advisor-scout:last-topic", query);
    } catch {
      // Not being able to remember the topic is not worth failing a search.
    }
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

  async function togglePaper(paper: Paper) {
    const isSaved = savedPapers.has(paper.workId);
    const res = isSaved
      ? await fetch(`/api/favorites?kind=paper&id=${encodeURIComponent(paper.workId)}`, { method: "DELETE" })
      : await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "paper", ...paper }),
        });
    if (!res.ok) {
      setSaveError("We couldn’t save that. Please try again.");
      return;
    }
    setSaveError(null);
    const next = new Set(savedPapers);
    if (isSaved) next.delete(paper.workId);
    else next.add(paper.workId);
    setSavedPapers(next);
  }

  async function toggleAuthor(author: Author) {
    const isSaved = savedAuthors.has(author.authorId);
    const res = isSaved
      ? await fetch(`/api/favorites?kind=author&id=${encodeURIComponent(author.authorId)}`, { method: "DELETE" })
      : await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "author", ...author }),
        });
    if (!res.ok) {
      setSaveError("We couldn’t save that. Please try again.");
      return;
    }
    setSaveError(null);
    const next = new Set(savedAuthors);
    if (isSaved) next.delete(author.authorId);
    else next.add(author.authorId);
    setSavedAuthors(next);
  }

  const foundNothing = status === "ready" && results?.topic === null;

  return (
    <div>
      <form onSubmit={onSubmit}>
        <label htmlFor="topic" className="block text-sm font-medium text-ink">
          Research topic
        </label>
        <p id="topic-hint" className="mt-1 text-sm text-muted">
          Work from the last three years, ranked by citations.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="topic"
            name="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-describedby="topic-hint"
            placeholder="mechanistic interpretability"
            autoComplete="off"
            className="motion w-full rounded-card border border-line bg-surface px-4 py-3 text-ink placeholder:text-muted/70 hover:border-muted/40 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <button
            type="submit"
            disabled={status === "loading" || topic.trim() === ""}
            className="motion rounded-card bg-accent px-6 py-3 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:bg-surface-2 disabled:text-muted sm:w-auto"
          >
            Search
          </button>
        </div>
      </form>

      {saveError && (
        <div role="alert" className="mt-6 rounded-card border border-line bg-surface px-4 py-3 text-ink">
          {saveError}
        </div>
      )}

      <div aria-live="polite" className="mt-12">
        {status === "idle" && lastVisited && (
          <section className="rise mb-10">
            <h2 className="text-sm font-medium text-muted">Pick up where you left off</h2>
            <button
              type="button"
              onClick={() => void runSearch(lastVisited)}
              className="motion mt-3 rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-accent hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {lastVisited}
            </button>
          </section>
        )}

        {status === "idle" && (
          <section className="rise">
            <h2 className="text-sm font-medium text-muted">
              {lastVisited ? "Or try something new" : "Try one of these"}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => void runSearch(example)}
                    className="motion rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {status === "loading" && <Skeleton query={lastQuery} />}

        {status === "unavailable" && (
          <Notice title="Search is unavailable">
            <p className="text-muted">
              We couldn’t reach the paper database. Anything you’ve saved is unaffected.
            </p>
            <button
              type="button"
              onClick={() => void runSearch(lastQuery)}
              className="motion mt-4 rounded-card border border-line bg-surface px-4 py-2 font-medium text-ink hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Try again
            </button>
          </Notice>
        )}

        {foundNothing && (
          <Notice title={`Nothing found for “${lastQuery}”`}>
            <p className="text-muted">
              Try a broader subject. These all work:
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.slice(0, 3).map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => void runSearch(example)}
                    className="motion rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </Notice>
        )}

        {status === "ready" && results?.topic && (
          <div className="rise">
            <p className="text-sm text-muted">
              Matched to{" "}
              <span className="font-medium text-ink">{results.topic.name}</span> in{" "}
              {results.topic.fieldName}
            </p>

            <div className="mt-10 grid gap-x-14 gap-y-14 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <section aria-labelledby="papers-heading">
                <SectionHeading id="papers-heading">Top papers</SectionHeading>
                <ul className="mt-5 max-w-[42rem] space-y-7">
                  {results.papers.map((paper) => (
                    <li key={paper.workId} className="flex items-start justify-between gap-3 sm:gap-5">
                      <div className="min-w-0">
                        <h3 className="font-serif text-[1.0625rem] leading-snug text-ink">
                          {paper.title}
                        </h3>
                        <p className="nums mt-1.5 text-sm text-muted">
                          {paper.authors.length > 0 && <>{paper.authors.join(", ")} · </>}
                          {paper.year}
                          {paper.venue ? ` · ${paper.venue}` : ""} ·{" "}
                          {paper.citedByCount.toLocaleString()} citations
                        </p>
                      </div>
                      <SaveButton
                        saved={savedPapers.has(paper.workId)}
                        label={paper.title}
                        onToggle={() => togglePaper(paper)}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <aside className="space-y-14">
                <RankedList
                  heading="Top authors"
                  items={results.authors.map((a) => ({
                    key: a.authorId,
                    name: a.name,
                    count: a.paperCount,
                    action: (
                      <SaveButton
                        saved={savedAuthors.has(a.authorId)}
                        label={a.name}
                        onToggle={() => toggleAuthor(a)}
                      />
                    ),
                  }))}
                />
                <RankedList
                  heading="Top institutions"
                  items={results.institutions.map((i) => ({
                    key: i.institutionId,
                    name: i.name,
                    count: i.paperCount,
                  }))}
                />
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
      {children}
    </h2>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rise rounded-card border border-line bg-surface p-6">
      <h2 className="font-serif text-lg text-ink">{title}</h2>
      <div className="mt-2 text-sm">{children}</div>
    </section>
  );
}

/** Six is enough to scan; the rest is one tap away. */
function RankedList({
  heading,
  items,
}: {
  heading: string;
  items: { key: string; name: string; count: number; action?: ReactNode }[];
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 6);

  return (
    <section>
      <SectionHeading>{heading}</SectionHeading>
      <ul className="mt-4 space-y-3.5">
        {visible.map((item) => (
          <li key={item.key} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 font-serif text-[0.9375rem] leading-snug text-ink">
              {item.name}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="nums text-sm text-muted">{item.count}</span>
              {item.action}
            </span>
          </li>
        ))}
      </ul>
      {items.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="motion mt-4 rounded-sm text-sm text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {showAll ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}

function Skeleton({ query }: { query: string }) {
  return (
    <div>
      <p className="text-sm text-muted">
        Searching for “{query}”…
      </p>
      <div className="mt-10 space-y-7" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-4 rounded bg-surface-2" style={{ width: `${88 - i * 7}%` }} />
            <div className="h-3 w-1/2 rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
