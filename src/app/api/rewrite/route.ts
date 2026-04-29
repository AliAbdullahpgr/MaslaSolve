import { NextResponse } from "next/server";
import { rewriteDescription } from "~/lib/gemini";

export async function POST(request: Request) {
  try {
    const { description } = (await request.json()) as { description?: string };

    if (!description) {
      return NextResponse.json(
        { error: "No description provided" },
        { status: 400 }
      );
    }

    const rewritten = await rewriteDescription(description);

    return NextResponse.json({ rewritten });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
