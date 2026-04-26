import { NextResponse } from "next/server";
import { db } from "~/server/db";

// Simple similarity: same category + same area + created within 7 days + not resolved
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const area = searchParams.get("area");
  const excludeId = searchParams.get("excludeId");

  if (!category || !area) {
    return NextResponse.json([]);
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const similar = await db.issue.findMany({
    where: {
      category: category as any,
      area,
      status: { not: "RESOLVED" },
      createdAt: { gte: sevenDaysAgo },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { upvotes: "desc" },
    take: 3,
    select: { id: true, title: true, upvotes: true, status: true, createdAt: true },
  });

  return NextResponse.json(similar);
}
