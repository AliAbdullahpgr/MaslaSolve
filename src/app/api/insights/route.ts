import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const CATEGORIES = ["POTHOLE", "GARBAGE", "TRAFFIC", "STREETLIGHT", "SEWAGE", "WATER", "OTHER"] as const;

type Cell = { area: string; category: string; count: number; intensity: number };
type Hotspot = { area: string; category: string; count: number; ratio: number };

export async function GET() {
  try {
    const since = new Date(Date.now() - 30 * 86400_000);
    const issues = await db.issue.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true, area: true, category: true, status: true,
        priority: true, createdAt: true, lat: true, lng: true,
      },
    });

    // ── Aggregate area × category counts ─────────────────────
    const buckets = new Map<string, Map<string, number>>(); // area → category → count
    const areaTotals = new Map<string, number>();
    const categoryTotals = new Map<string, number>();
    for (const i of issues) {
      const a = i.area || "Unknown";
      if (!buckets.has(a)) buckets.set(a, new Map());
      const m = buckets.get(a)!;
      m.set(i.category, (m.get(i.category) ?? 0) + 1);
      areaTotals.set(a, (areaTotals.get(a) ?? 0) + 1);
      categoryTotals.set(i.category, (categoryTotals.get(i.category) ?? 0) + 1);
    }

    // ── Build flat heatmap cells with normalized intensity ───
    const cells: Cell[] = [];
    let maxCount = 0;
    for (const [area, m] of buckets) {
      for (const cat of CATEGORIES) {
        const c = m.get(cat) ?? 0;
        if (c > maxCount) maxCount = c;
        cells.push({ area, category: cat, count: c, intensity: 0 });
      }
    }
    for (const c of cells) c.intensity = maxCount === 0 ? 0 : c.count / maxCount;

    // ── Hotspot detection: per-category, areas >2x the median ───
    const hotspots: Hotspot[] = [];
    for (const cat of CATEGORIES) {
      const counts = Array.from(buckets.entries())
        .map(([area, m]) => ({ area, count: m.get(cat) ?? 0 }))
        .filter((x) => x.count > 0);
      if (counts.length === 0) continue;
      const sorted = counts.map((c) => c.count).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 1;
      for (const { area, count } of counts) {
        const ratio = count / Math.max(median, 1);
        if (count >= 3 && ratio >= 2) {
          hotspots.push({ area, category: cat, count, ratio });
        }
      }
    }
    hotspots.sort((a, b) => b.ratio - a.ratio);
    const topHotspots = hotspots.slice(0, 3);

    // ── Status mix per area (for narration context) ──────────
    const statusByArea: Record<string, { reported: number; in_progress: number; resolved: number }> = {};
    for (const i of issues) {
      const a = i.area || "Unknown";
      if (!statusByArea[a]) statusByArea[a] = { reported: 0, in_progress: 0, resolved: 0 };
      if (i.status === "REPORTED") statusByArea[a].reported++;
      else if (i.status === "IN_PROGRESS") statusByArea[a].in_progress++;
      else if (i.status === "RESOLVED") statusByArea[a].resolved++;
    }

    // ── Gemini narration ─────────────────────────────────────
    let narrative = "";
    if (topHotspots.length === 0 && issues.length > 0) {
      narrative = `Across ${issues.length} reports in the last 30 days, complaints are spread evenly — no single area is significantly outpacing the rest.`;
    } else if (issues.length === 0) {
      narrative = "No reports filed in the last 30 days yet — the city is quiet.";
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const facts = topHotspots
        .map(
          (h) =>
            `- ${h.area} has ${h.count} ${h.category.toLowerCase()} reports — about ${h.ratio.toFixed(1)}× the city median for that category.`,
        )
        .join("\n");
      const totals = Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c, n]) => `${c} (${n})`)
        .join(", ");
      const prompt = `You are a Lahore municipal data analyst. Write a tight 2–3 sentence insight (English) for an admin dashboard, based ONLY on these facts. Mention the top hotspot, why it likely matters operationally (e.g. likely substation issue, drainage line, school-route), and one concrete action. Do not invent numbers.

Facts:
- Time window: last 30 days, ${issues.length} total reports.
- Top categories: ${totals}.
${facts}

Return plain prose, no markdown, no headings.`;
      try {
        const r = await model.generateContent(prompt);
        narrative = r.response.text().trim();
      } catch {
        narrative = `${topHotspots[0]!.area} is the standout — ${topHotspots[0]!.count} ${topHotspots[0]!.category.toLowerCase()} reports, roughly ${topHotspots[0]!.ratio.toFixed(1)}× the city median. Worth a targeted dispatch.`;
      }
    }

    // ── Geo points for the map heat layer ────────────────────
    const points = issues
      .filter((i) => i.lat != null && i.lng != null)
      .map((i) => ({ lat: i.lat!, lng: i.lng!, category: i.category, status: i.status }));

    return NextResponse.json({
      total: issues.length,
      maxCount,
      cells,
      hotspots: topHotspots,
      statusByArea,
      categoryTotals: Object.fromEntries(categoryTotals),
      narrative,
      points,
      areas: Array.from(buckets.keys()).sort(),
      categories: CATEGORIES as unknown as string[],
    });
  } catch (e) {
    console.error("insights error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
