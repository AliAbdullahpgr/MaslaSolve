import { db } from "~/server/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cosineSimilarity } from "~/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const DEPARTMENTS: Record<string, { name: string; lead: string }> = {
  POTHOLE: { name: "Lahore Roads & PHA", lead: "Roads Maintenance" },
  GARBAGE: { name: "Lahore Waste Management Co.", lead: "Sanitation Crew" },
  TRAFFIC: { name: "Lahore Traffic Police", lead: "Signal Engineering" },
  STREETLIGHT: { name: "WAPDA / LDA", lead: "Electrical Maintenance" },
  SEWAGE: { name: "WASA Lahore", lead: "Drainage Crew" },
  WATER: { name: "WASA Lahore", lead: "Water Supply" },
  OTHER: { name: "City Operations Center", lead: "Triage Desk" },
};

function sse(controller: ReadableStreamDefaultController, event: string, data: Record<string, unknown>) {
  const enc = new TextEncoder();
  const payload = `data: ${JSON.stringify({ event, ...data })}\n\n`;
  controller.enqueue(enc.encode(payload));
}

async function urlToBase64(url: string): Promise<{ b64: string; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { b64: buf.toString("base64"), mime: res.headers.get("content-type") ?? "image/jpeg" };
  } catch {
    return null;
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => sse(controller, event, data);
      try {
        send("start", { issueId: id, ts: Date.now() });

        const issue = await db.issue.findUnique({ where: { id } });
        if (!issue) {
          send("error", { message: "Issue not found" });
          controller.close();
          return;
        }
        send("issue", {
          id: issue.id,
          title: issue.title,
          category: issue.category,
          area: issue.area,
        });

        // ── Step 1: validate photo ──────────────────────────────
        send("step", {
          n: 1,
          tool: "validateImage",
          status: "running",
          label: "Validating photo matches the reported category",
        });
        let photoVerdict: { valid: boolean; reason: string; matchesCategory: boolean } = {
          valid: true,
          reason: issue.photo ? "Photo present" : "No photo provided — text-only report",
          matchesCategory: true,
        };
        if (issue.photo) {
          const imgData = await urlToBase64(issue.photo);
          if (imgData) {
            const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const visionPrompt = `You are validating a civic complaint photo. The reporter claims the issue is: ${issue.category}.
Title: "${issue.title}". Description: "${issue.description}".
Look at the image and respond ONLY with JSON:
{ "valid": boolean, "matchesCategory": boolean, "reason": "one short sentence" }
"valid" = the photo shows a real civic issue (not random/selfie/screenshot).
"matchesCategory" = the photo content matches the claimed category.`;
            try {
              const r = await visionModel.generateContent([
                visionPrompt,
                { inlineData: { mimeType: imgData.mime, data: imgData.b64 } },
              ]);
              const m = /\{[\s\S]*\}/.exec(r.response.text());
              if (m) photoVerdict = { ...photoVerdict, ...(JSON.parse(m[0]) as typeof photoVerdict) };
            } catch {
              photoVerdict.reason = "Vision check skipped (model error)";
            }
          }
        }
        send("step", {
          n: 1,
          tool: "validateImage",
          status: "done",
          label: "Photo validation",
          result: photoVerdict,
        });

        // ── Step 2: find duplicates (embeddings) ────────────────
        send("step", {
          n: 2,
          tool: "findDuplicates",
          status: "running",
          label: "Searching for duplicate / related reports nearby",
        });
        const RADIUS = 0.018;
        const sinceDays = 30;
        const since = new Date(Date.now() - sinceDays * 86400_000);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, any> = {
          id: { not: issue.id },
          status: { not: "RESOLVED" },
          createdAt: { gte: since },
          category: issue.category,
        };
        if (issue.lat != null && issue.lng != null) {
          where.lat = { gte: issue.lat - RADIUS, lte: issue.lat + RADIUS };
          where.lng = { gte: issue.lng - RADIUS, lte: issue.lng + RADIUS };
        } else {
          where.area = issue.area;
        }
        const candidates = await db.issue.findMany({
          where,
          select: {
            id: true, title: true, area: true, category: true,
            upvotes: true, embedding: true, createdAt: true,
          },
          take: 80,
        });
        const myEmb = Array.isArray(issue.embedding) ? issue.embedding : [];
        const dupes = candidates
          .map((c) => {
            const sim = myEmb.length && c.embedding?.length
              ? cosineSimilarity(myEmb, c.embedding)
              : 0;
            return { ...c, similarity: sim };
          })
          .filter((c) => c.similarity >= 0.78)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5)
          .map(({ embedding: _embedding, ...rest }) => rest);
        send("step", {
          n: 2,
          tool: "findDuplicates",
          status: "done",
          label: `Found ${dupes.length} likely duplicate${dupes.length === 1 ? "" : "s"}`,
          result: { duplicates: dupes, totalNearby: candidates.length },
        });

        // ── Step 3: pick department ─────────────────────────────
        send("step", {
          n: 3,
          tool: "pickDepartment",
          status: "running",
          label: "Routing to the right department",
        });
        const dept = DEPARTMENTS[issue.category] ?? DEPARTMENTS.OTHER!;
        send("step", {
          n: 3,
          tool: "pickDepartment",
          status: "done",
          label: "Department assigned",
          result: { department: dept.name, lead: dept.lead, category: issue.category },
        });

        // ── Step 4: draft citizen reply (Urdu) ──────────────────
        send("step", {
          n: 4,
          tool: "draftCitizenReply",
          status: "running",
          label: "Drafting acknowledgment for the citizen (Urdu)",
        });
        const replyModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const replyPrompt = `You are a Pakistan municipal customer-service writer. Write a short (2 sentences) acknowledgment in polite Urdu to a citizen who reported this civic issue.
Issue: ${issue.title}
Category: ${issue.category}
Area: ${issue.area}
${dupes.length > 0 ? `Note: ${dupes.length} similar reports already on file in the same area.` : ""}
Mention which department (${dept.name}) is taking it up. Do not promise a specific date. Output the Urdu text only, no quotes.`;
        let citizenReply = "";
        try {
          const r = await replyModel.generateContent(replyPrompt);
          citizenReply = r.response.text().trim();
        } catch {
          citizenReply = "آپ کی شکایت موصول ہوگئی ہے، متعلقہ محکمے کو ارسال کر دی گئی ہے۔";
        }
        send("step", {
          n: 4,
          tool: "draftCitizenReply",
          status: "done",
          label: "Citizen reply drafted",
          result: { reply: citizenReply },
        });

        // ── Step 5: dispatch order (English) ────────────────────
        send("step", {
          n: 5,
          tool: "draftDispatchOrder",
          status: "running",
          label: "Drafting dispatch order for the field crew",
        });
        const dispatchPrompt = `Draft a 3-line internal dispatch order (English) for ${dept.lead} at ${dept.name}.
Subject line: "Dispatch — ${issue.category} — ${issue.area}"
Body must include: 1) what to do, 2) location reference, 3) priority (${issue.priority}).
Be terse and operational. No greetings or signoffs.
Issue: ${issue.title}
Description: ${issue.description}
Location: ${issue.location} (${issue.lat ?? "?"}, ${issue.lng ?? "?"})`;
        let dispatchOrder = "";
        try {
          const r = await replyModel.generateContent(dispatchPrompt);
          dispatchOrder = r.response.text().trim();
        } catch {
          dispatchOrder = `Dispatch — ${issue.category} — ${issue.area}\nInspect and resolve the reported ${issue.category.toLowerCase()} issue.\nPriority: ${issue.priority}`;
        }
        send("step", {
          n: 5,
          tool: "draftDispatchOrder",
          status: "done",
          label: "Dispatch order ready",
          result: { dispatch: dispatchOrder },
        });

        send("complete", {
          summary: {
            photoVerdict,
            duplicateCount: dupes.length,
            department: dept,
            citizenReply,
            dispatchOrder,
          },
        });
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "triage failed";
        sse(controller, "error", { message: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
