import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import SearchClient from "./search-client";

// The whole page depends on who is signed in, so there is nothing to
// prerender. Render it on request instead.
export const instant = false;

export default async function Home() {
  // Decided here, at the resource, not in middleware.
  await auth.protect();

  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Advisor Scout</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/saved"
              className="rounded-md px-2 py-1 font-medium text-teal-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Saved
            </Link>
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <SearchClient />
      </main>
    </>
  );
}
