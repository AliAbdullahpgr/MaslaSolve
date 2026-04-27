import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { embedIssueText, cosineSimilarity } from "~/lib/gemini";

// Embedding-based duplicate detection.
// Strategy: embed the candidate text, fetch open issues within a generous bbox + time window,
// rank by cosine similarity, return top matches above threshold.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const area = searchParams.get("area");
  const excludeId = searchParams.get("excludeId");
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const title = searchParams.get("title") ?? "";
  const description = searchParams.get("description") ?? "";

  if (!category) return NextResponse.json([]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const RADIUS_DEG = 0.018; // ~2km bbox — wide net, embeddings do the precision work

  const where: any = {
    status: { not: "RESOLVED" },
    createdAt: { gte: thirtyDaysAgo },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };
  if (hasCoords) {
    where.lat = { gte: lat - RADIUS_DEG, lte: lat + RADIUS_DEG };
    where.lng = { gte: lng - RADIUS_DEG, lte: lng + RADIUS_DEG };
  } else if (area) {
    where.area = area;
  } else {
    return NextResponse.json([]);
  }

  // Hard-restrict to same category. Cross-category embedding similarity is noisy
  // (civic-issue text shares too much vocabulary), so we let category do the coarse
  // filter and let embeddings handle "is this the same incident?".
  where.category = category as any;

  const candidates = await db.issue.findMany({
    where,
    select: {
      id: true, title: true, description: true, category: true,
      upvotes: true, status: true, createdAt: true, lat: true, lng: true,
      embedding: true, area: true,
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const queryText = `${category} | ${area ?? ""} | ${title} | ${description}`;
  const queryEmbedding = await embedIssueText(queryText);

  // If embedding fails, gracefully fall back to category+proximity
  if (!queryEmbedding) {
    const fallback = candidates
      .filter((c) => c.category === category)
      .sort((a, b) => b.upvotes - a.upvotes)
      .slice(0, 3);
    return NextResponse.json(fallback);
  }

  // Threshold tuning: civic-text embeddings are dense — "two streetlights broken" vs
  // "pothole on road" sit around 0.65–0.70 just from shared domain vocab. Real
  // duplicates of the same incident sit at 0.85+. Use 0.78 as the floor and 0.85+
  // for the "very likely duplicate" tier.
  const scored = candidates
    .map((c) => {
      const sim = c.embedding && c.embedding.length
        ? cosineSimilarity(queryEmbedding, c.embedding as number[])
        : 0;
      return { ...c, similarity: sim };
    })
    .filter((c) => c.similarity >= 0.78)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 4)
    .map(({ embedding, ...rest }) => rest);

  return NextResponse.json(scored);
}
