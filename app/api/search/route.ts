import { NextResponse } from "next/server";
import {
  resolveTopic,
  topPapers,
  topAuthors,
  topInstitutions,
  OpenAlexDownError,
} from "@/lib/openalex";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Enter a topic to search." }, { status: 400 });
  }

  try {
    // Resolving the topic first also keeps a nonsense query down to one call
    // instead of four.
    const topic = await resolveTopic(q);
    if (!topic) {
      return NextResponse.json({
        query: q,
        topic: null,
        papers: [],
        authors: [],
        institutions: [],
      });
    }

    const [papers, authors, institutions] = await Promise.all([
      topPapers(q, topic.fieldId),
      topAuthors(q, topic.fieldId),
      topInstitutions(q, topic.fieldId),
    ]);

    return NextResponse.json({ query: q, topic, papers, authors, institutions });
  } catch (e) {
    if (e instanceof OpenAlexDownError) {
      return NextResponse.json(
        { error: "Search is unavailable right now. Please try again shortly." },
        { status: 503 },
      );
    }
    throw e;
  }
}
