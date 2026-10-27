"use client";

import { useState } from "react";

/**
 * Quiet by default, accent only once something is saved.
 *
 * There are twenty of these on a results page. If each one were an outlined
 * button they would compete with each other and with the search, and nothing
 * would stand out. So the resting state is close to the page, and the accent
 * is reserved for the one fact worth noticing: this is yours now.
 *
 * It is a real button, it carries aria-pressed so a screen reader hears the
 * state, and the hidden label says what is being saved rather than just
 * "Save".
 */
export default function SaveButton({
  saved,
  label,
  onToggle,
}: {
  saved: boolean;
  label: string;
  onToggle: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await onToggle();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={saved}
      className={`motion shrink-0 rounded-full px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 ${
        saved
          ? "bg-accent-soft font-medium text-accent"
          : "text-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {saved ? "Saved" : "Save"}
      <span className="sr-only"> {label}</span>
    </button>
  );
}
