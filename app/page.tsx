import { auth } from "@clerk/nextjs/server";
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
          <UserButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <SearchClient />
      </main>
    </>
  );
}
