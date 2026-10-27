import { auth } from "@clerk/nextjs/server";
import SiteHeader from "./site-header";
import SearchClient from "./search-client";

// The whole page depends on who is signed in, so there is nothing to
// prerender. Render it on request instead.
export const instant = false;

export default async function Home() {
  // Decided here, at the resource, not in middleware.
  await auth.protect();

  return (
    <>
      <SiteHeader current="search" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12">
        <SearchClient />
      </main>
    </>
  );
}
