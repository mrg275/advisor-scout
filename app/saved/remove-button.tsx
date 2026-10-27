"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RemoveButton({
  kind,
  id,
  label,
}: {
  kind: "paper" | "author";
  id: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    await fetch(`/api/favorites?kind=${kind}&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="motion shrink-0 rounded-full px-3 py-1 text-sm text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
    >
      Remove
      <span className="sr-only"> {label}</span>
    </button>
  );
}
