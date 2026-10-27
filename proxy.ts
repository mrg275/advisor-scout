import { clerkMiddleware } from "@clerk/nextjs/server";

// This only makes the session available to the app. It is deliberately not
// where access is decided: path matching can diverge from how Next.js routes
// requests and leave a resource reachable. Each page and route handler that
// touches protected data checks for itself, and row-level security in
// Supabase is the final backstop.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
