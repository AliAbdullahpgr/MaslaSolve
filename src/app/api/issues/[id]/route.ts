import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const issue = await db.issue.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, name: true, image: true } },
      timeline: { orderBy: { timestamp: "asc" } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      },
      _count: { select: { votes: true } },
    },
  });

  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return NextResponse.json(issue);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const allowed = ["status", "priority", "title", "description", "location", "photo", "resolvedPhoto"];
    const data = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowed.includes(key))
    );

    const issue = await db.issue.update({
      where: { id },
      data,
      include: {
        reporter: { select: { id: true, name: true, image: true } },
        timeline: { orderBy: { timestamp: "asc" } },
        _count: { select: { comments: true, votes: true } },
      },
    });

    return NextResponse.json(issue);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await db.issue.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
