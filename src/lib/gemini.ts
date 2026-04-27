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
