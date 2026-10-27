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
      className="shrink-0 rounded-md border border-stone-400 bg-white px-3 py-1 text-sm font-medium text-stone-900 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50"
    >
      Remove
      <span className="sr-only"> {label}</span>
    </button>
  );
}
