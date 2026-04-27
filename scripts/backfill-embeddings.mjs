// Backfill Gemini embeddings for issues that don't have one yet.
// Run: node scripts/backfill-embeddings.mjs
import { PrismaClient } from "../generated/prisma/index.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const db = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

async function embed(text) {
  const r = await model.embedContent(text);
  return r.embedding.values;
}

async function main() {
  const issues = await db.issue.findMany({
    select: { id: true, title: true, description: true, category: true, area: true, embedding: true },
  });
  const todo = issues.filter((i) => !i.embedding || i.embedding.length === 0);
  console.log(`Found ${issues.length} issues, ${todo.length} need embeddings.`);

  let done = 0;
  for (const i of todo) {
    const text = `${i.category} | ${i.area} | ${i.title} | ${i.description}`;
    try {
      const v = await embed(text);
      await db.issue.update({ where: { id: i.id }, data: { embedding: v } });
      done++;
      if (done % 5 === 0) console.log(`  ${done}/${todo.length}`);
    } catch (e) {
      console.error(`  failed for ${i.id}:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`Done: ${done} embedded.`);
  await db.$disconnect();
}

main();
