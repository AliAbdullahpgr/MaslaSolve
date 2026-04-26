import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

const createIssueSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["POTHOLE", "GARBAGE", "TRAFFIC", "STREETLIGHT", "SEWAGE", "WATER", "OTHER"]),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  location: z.string().min(1),
  area: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  photo: z.string().optional(),
  isAnonymous: z.boolean().default(false),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const area = searchParams.get("area");
  const priority = searchParams.get("priority");

  const issues = await db.issue.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(category && { category: category as any }),
      ...(area && { area }),
      ...(priority && { priority: priority as any }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { id: true, name: true, image: true } },
      timeline: { orderBy: { timestamp: "asc" } },
      _count: { select: { comments: true, votes: true } },
    },
  });

  return NextResponse.json(issues);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createIssueSchema.parse(body);

    const issue = await db.issue.create({
      data: {
        ...parsed,
        description: parsed.description || "No description provided",
        status: "REPORTED",
        timeline: {
          create: [
            { label: "Reported", done: true },
            { label: "Verified", done: false },
            { label: "In Progress", done: false },
            { label: "Resolved", done: false },
          ],
        },
      },
      include: {
        timeline: true,
      },
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
