import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * A Supabase client that carries the signed-in person's Clerk token.
 *
 * Supabase reads the 'sub' claim from that token, which is what every
 * row-level security policy compares against user_id. We never pass a
 * user_id from the browser, and we never use a service-role key here: if
 * the policies are wrong, the database refuses the query rather than
 * trusting the app.
 */
export async function createUserScopedClient() {
  const { getToken } = await auth();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { accessToken: async () => (await getToken()) ?? null },
  );
}
