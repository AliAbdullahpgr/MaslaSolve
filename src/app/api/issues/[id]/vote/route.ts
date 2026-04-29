import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { userId } = (await request.json()) as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const existingVote = await db.vote.findUnique({
      where: {
        issueId_userId: {
          issueId: id,
          userId,
        },
      },
    });

    if (existingVote) {
      await db.vote.delete({ where: { id: existingVote.id } });
      await db.issue.update({
        where: { id },
        data: { upvotes: { decrement: 1 } },
      });
      return NextResponse.json({ voted: false });
    }

    await db.vote.create({ data: { issueId: id, userId } });

    const updated = await db.issue.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
      select: { upvotes: true, priority: true },
    });

    // Auto-escalate to URGENT when votes cross 50
    if (updated.upvotes >= 50 && updated.priority !== "URGENT") {
      await db.issue.update({ where: { id }, data: { priority: "URGENT" } });
    }

    return NextResponse.json({ voted: true, escalated: updated.upvotes >= 50 && updated.priority !== "URGENT" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
