import { NextResponse } from "next/server";
import { resolveTopic, OpenAlexDownError } from "@/lib/openalex";

// Confirms the OpenAlex key works, without ever revealing it.
export async function GET() {
  const hasKey = Boolean(process.env.OPENALEX_API_KEY);
  try {
    const topic = await resolveTopic("mechanistic interpretability");
    return NextResponse.json({ hasKey, reachedOpenAlex: true, topic });
  } catch (e) {
    const down = e instanceof OpenAlexDownError;
    return NextResponse.json(
      { hasKey, reachedOpenAlex: false, error: down ? e.message : "unknown" },
      { status: 503 },
    );
  }
}
