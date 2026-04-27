import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function analyzeImage(imageBase64: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze this civic issue image. Respond ONLY with a JSON object in this exact format:
{
  "category": "one of: POTHOLE, GARBAGE, TRAFFIC, STREETLIGHT, SEWAGE, WATER, OTHER",
  "priority": "one of: URGENT, HIGH, MEDIUM, LOW",
  "confidence": 0.95,
  "description": "Brief description of what you see"
}

Rules:
- POTHOLE: road damage, holes in street
- GARBAGE: trash piles, waste accumulation
- TRAFFIC: broken signals, signage issues
- STREETLIGHT: broken lights, poles
- SEWAGE: overflowing drains, manholes
- WATER: leaks, flooding
- OTHER: anything else

Urgent if: safety hazard, large scale, blocking road
High if: affects many people, spreading
Medium if: noticeable but contained
Low if: cosmetic or minor`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return null;
  }
}

export async function embedIssueText(text: string): Promise<number[] | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Gemini embed error:", error);
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export async function transcribeAudio(audioBase64: string, mimeType: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a civic-issue intake assistant for Pakistan. The user is speaking in Urdu, Roman Urdu, English, or a mix.
Transcribe what they said, then extract a structured civic complaint.

Respond ONLY with valid JSON in this exact format:
{
  "transcript": "verbatim transcription in original language/script",
  "title": "short English title under 80 chars suitable for a civic dashboard",
  "description": "clear English description for city officials, under 100 words",
  "category": "one of: POTHOLE, GARBAGE, TRAFFIC, STREETLIGHT, SEWAGE, WATER, OTHER",
  "priority": "one of: URGENT, HIGH, MEDIUM, LOW",
  "areaHint": "any neighborhood, sector, or landmark mentioned (or empty string)",
  "followUp": "if critical info is missing (location or what is broken), a short Urdu question to ask the user; otherwise empty string"
}

Categorization rules:
- POTHOLE: road damage, holes
- GARBAGE: trash piles, kachra
- TRAFFIC: signals, signage, traffic jams
- STREETLIGHT: broken lights, poles, batti
- SEWAGE: drains, manholes, gutter, naala
- WATER: leaks, flooding, paani
- OTHER: anything else

Priority:
- URGENT: safety hazard, blocking road, large scale
- HIGH: affects many people, spreading
- MEDIUM: noticeable but contained
- LOW: cosmetic`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: audioBase64 } },
    ]);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  } catch (error) {
    console.error("Gemini transcribe error:", error);
    return null;
  }
}

export async function rewriteDescription(description: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Rewrite this civic issue description to be clear, concise, and actionable for city officials. Keep it under 100 words. Maintain the original language if it's not English.

Original: "${description}"`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini rewrite error:", error);
    return description;
  }
}
