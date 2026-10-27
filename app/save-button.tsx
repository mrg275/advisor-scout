"use client";

import { useState } from "react";

type Props = {
  saved: boolean;
  label: string;
  onToggle: () => Promise<void>;
};

/**
 * A real <button>, so it is reachable by keyboard and announced correctly.
 * aria-pressed carries the saved state to a screen reader, and the label
 * says what the item is rather than just "Save".
 */
export default function SaveButton({ saved, label, onToggle }: Props) {
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
      className={`shrink-0 rounded-md border px-3 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50 ${
        saved
          ? "border-teal-800 bg-teal-800 text-white hover:bg-teal-900"
          : "border-stone-400 bg-white text-stone-900 hover:bg-stone-100"
      }`}
    >
      {saved ? "Saved" : "Save"}
      <span className="sr-only"> {label}</span>
    </button>
  );
}
