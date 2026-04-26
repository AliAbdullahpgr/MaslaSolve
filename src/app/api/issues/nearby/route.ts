import { NextResponse } from "next/server";
import { db } from "~/server/db";

// Approx 500m in degrees latitude/longitude at Lahore's latitude
const HALF_DEGREE = 0.0045;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) return NextResponse.json({ count: 0, urgent: 0 });

  const issues = await db.issue.findMany({
    where: {
      lat: { gte: lat - HALF_DEGREE, lte: lat + HALF_DEGREE },
      lng: { gte: lng - HALF_DEGREE, lte: lng + HALF_DEGREE },
      status: { not: "RESOLVED" },
    },
    select: { id: true, priority: true },
  });

  return NextResponse.json({
    count: issues.length,
    urgent: issues.filter((i) => i.priority === "URGENT").length,
  });
}
