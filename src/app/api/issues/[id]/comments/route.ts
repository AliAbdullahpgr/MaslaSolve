import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

const createCommentSchema = z.object({
  body: z.string().min(1),
  authorId: z.string().min(1),
  isOfficial: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const comments = await db.comment.findMany({
    where: { issueId: id },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(comments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body: unknown = await request.json();
    const parsed = createCommentSchema.parse(body);

    const comment = await db.comment.create({
      data: {
        ...parsed,
        issueId: id,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
