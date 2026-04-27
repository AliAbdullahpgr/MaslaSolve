import { PrismaClient } from "../generated/prisma/index.js";

const db = new PrismaClient();

// Title -> { photo, resolvedPhoto? }
const PATCHES = {
  "Crater-sized pothole at Liberty roundabout": {
    photo: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqjLXNvNjbyt4NHIA2q76S13TkYrRxeWiKBcf8d",
  },
  "Streetlights out for 3 nights — Y Block": {
    photo: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqj4q7etzqhX6oWuLeOA4TsBvrzgDJkx0aRcYIH",
  },
  "Traffic signal stuck on red — Ferozepur Rd": {
    photo: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqj4TN7iMhX6oWuLeOA4TsBvrzgDJkx0aRcYIH2",
  },
  "Sewage overflow on side street": {
    photo: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqjKJCDv9y0mEBhjJMxYGH3rfS92sZVdc8IXD1i",
  },
  "Pothole resolved — Mall Rd near GPO": {
    photo: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqjD4y3aNsXiIP3GqJgKYpv2komya5ZsejdNcVw", // before
    resolvedPhoto: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqjdBTeZaXMcWqj20ewUs8typL3oxViaJEfmDZn", // after
  },
};

async function main() {
  for (const [title, data] of Object.entries(PATCHES)) {
    const result = await db.issue.updateMany({ where: { title }, data });
    console.log(`${result.count} updated · ${title}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
