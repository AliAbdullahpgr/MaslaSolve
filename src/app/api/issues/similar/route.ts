import { NextResponse } from "next/server";
import { db } from "~/server/db";

// Similar = same category + within ~500m + last 7 days + not resolved.
// Falls back to area match when lat/lng aren't provided.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const area = searchParams.get("area");
  const excludeId = searchParams.get("excludeId");
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (!category) return NextResponse.json([]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const RADIUS_DEG = 0.0045; // ≈ 500m

  const where: any = {
    category: category as any,
    status: { not: "RESOLVED" },
    createdAt: { gte: sevenDaysAgo },
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

  const similar = await db.issue.findMany({
    where,
    orderBy: { upvotes: "desc" },
    take: 3,
    select: { id: true, title: true, upvotes: true, status: true, createdAt: true, lat: true, lng: true },
  });

  return NextResponse.json(similar);
}
