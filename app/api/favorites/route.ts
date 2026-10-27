import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createUserScopedClient } from "@/lib/supabase";

// Every handler checks for a user, then lets row-level security decide which
// rows that user may touch. The app never filters by user_id itself.

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const supabase = await createUserScopedClient();
  const [papers, authors] = await Promise.all([
    supabase.from("favorite_papers").select("*").order("created_at", { ascending: false }),
    supabase.from("favorite_authors").select("*").order("created_at", { ascending: false }),
  ]);

  if (papers.error || authors.error) {
    return NextResponse.json(
      { error: papers.error?.message ?? authors.error?.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ papers: papers.data, authors: authors.data });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json();
  const supabase = await createUserScopedClient();

  // user_id is not taken from the request. It comes from the token, through
  // the column default, and is enforced by the policy's with-check.
  if (body.kind === "paper") {
    const { error } = await supabase.from("favorite_papers").insert({
      work_id: body.workId,
      title: body.title,
      publication_year: body.year,
      cited_by_count: body.citedByCount,
      doi: body.doi,
      venue: body.venue,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ saved: true });
  }

  if (body.kind === "author") {
    // No institution here on purpose: OpenAlex's author grouping returns only
    // an id, a name and a count, so there is nothing to store. The column stays
    // nullable for when we do fetch it.
    const { error } = await supabase.from("favorite_authors").insert({
      author_id: body.authorId,
      display_name: body.name,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ saved: true });
  }

  return NextResponse.json({ error: "Unknown kind." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const id = params.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = await createUserScopedClient();
  const table = kind === "author" ? "favorite_authors" : "favorite_papers";
  const column = kind === "author" ? "author_id" : "work_id";

  const { error } = await supabase.from(table).delete().eq(column, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ removed: true });
}
