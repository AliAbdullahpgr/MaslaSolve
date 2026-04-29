import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";
import { embedIssueText } from "~/lib/gemini";

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

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
  const whereFilter: any = {
    ...(status && { status }),
    ...(category && { category }),
    ...(area && { area }),
    ...(priority && { priority }),
  };
  const rawIssues = await db.issue.findMany({
    where: whereFilter,
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { id: true, name: true, image: true } },
      timeline: { orderBy: { timestamp: "asc" } },
      _count: { select: { comments: true, votes: true } },
    },
  });
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

  return NextResponse.json(rawIssues);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = createIssueSchema.parse(body);

    const description = parsed.description ?? "No description provided";
    const embeddingText = `${parsed.category} | ${parsed.area} | ${parsed.title} | ${description}`;
    const embedding = (await embedIssueText(embeddingText)) ?? [];

    const issue = await db.issue.create({
      data: {
        ...parsed,
        description,
        embedding,
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
