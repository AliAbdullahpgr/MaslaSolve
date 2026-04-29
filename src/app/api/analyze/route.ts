import { NextResponse } from "next/server";
import { analyzeImage } from "~/lib/gemini";

export async function POST(request: Request) {
  try {
    const { imageBase64 } = (await request.json()) as { imageBase64: string };

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const analysis = await analyzeImage(imageBase64);

    if (!analysis) {
      return NextResponse.json(
        { error: "Failed to analyze image" },
        { status: 500 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
