import { NextResponse } from "next/server";
import { transcribeAudio } from "~/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { audioBase64, mimeType } = (await request.json()) as { audioBase64?: string; mimeType?: string };
    if (!audioBase64) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }
    const result = await transcribeAudio(audioBase64, mimeType ?? "audio/webm");
    if (!result) {
      return NextResponse.json({ error: "Failed to transcribe" }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("voice route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
