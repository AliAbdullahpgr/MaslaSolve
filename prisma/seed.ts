import { PrismaClient } from "../generated/prisma";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("password", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@maslasolve.pk" },
    update: {},
    create: { email: "admin@maslasolve.pk", name: "LDA Admin", password: adminPassword, role: "ADMIN" },
  });

  const user1 = await db.user.upsert({
    where: { email: "ayesha@example.com" },
    update: {},
    create: { email: "ayesha@example.com", name: "Ayesha K.", password: userPassword, role: "CITIZEN" },
  });

  const user2 = await db.user.upsert({
    where: { email: "hassan@example.com" },
    update: {},
    create: { email: "hassan@example.com", name: "Hassan A.", password: userPassword, role: "CITIZEN" },
  });

  const user3 = await db.user.upsert({
    where: { email: "bilal@example.com" },
    update: {},
    create: { email: "bilal@example.com", name: "Bilal R.", password: userPassword, role: "CITIZEN" },
  });

  console.log("Users created:", admin.email, user1.email, user2.email, user3.email);

  const issueCount = await db.issue.count();
  if (issueCount > 0) {
    console.log(`Skipping issues seed — ${issueCount} issues already exist.`);
  } else {
    const issues = [
      {
        title: "Crater-sized pothole at Liberty roundabout",
        description: "Massive pothole right at the Liberty roundabout exit toward MM Alam. Bikes have been crashing into it after dark.",
        category: "POTHOLE" as const,
        status: "IN_PROGRESS" as const,
        priority: "URGENT" as const,
        location: "Liberty Chowk, Gulberg III",
        area: "Gulberg",
        lat: 31.5125,
        lng: 74.3434,
        photo: "https://images.unsplash.com/photo-1597007030739-6d2e7172ee6c?w=900&q=70",
        upvotes: 312,
        reporterId: user1.id,
        timeline: [
          { label: "Reported", done: true, note: "22 Apr · 9:14 am" },
          { label: "Verified", done: true, note: "12 neighbours confirmed" },
          { label: "In Progress", done: true, note: "Assigned to LDA Roads Div." },
          { label: "Resolved", done: false, note: "ETA 27 Apr" },
        ],
      },
      {
        title: "Streetlights out for 3 nights — Y Block",
        description: "Entire stretch from Y Block market to commercial area is pitch black. Women avoid the route after Maghrib.",
        category: "STREETLIGHT" as const,
        status: "REPORTED" as const,
        priority: "URGENT" as const,
        location: "Y Block, DHA Phase 3",
        area: "DHA",
        lat: 31.47,
        lng: 74.42,
        photo: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=70",
        upvotes: 184,
        reporterId: user2.id,
        timeline: [
          { label: "Reported", done: true, note: "23 Apr · 8:41 pm" },
          { label: "Verified", done: true },
          { label: "In Progress", done: false },
          { label: "Resolved", done: false },
        ],
      },
      {
        title: "Garbage pile blocking footpath",
        description: "Hasn't been picked in 4 days. Dogs are tearing it open. Smell is unbearable.",
        category: "GARBAGE" as const,
        status: "REPORTED" as const,
        priority: "HIGH" as const,
        location: "Mozang Chungi, near bus stop",
        area: "Old Lahore",
        lat: 31.55,
        lng: 74.31,
        photo: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=900&q=70",
        upvotes: 96,
        reporterId: user3.id,
      },
      {
        title: "Traffic signal stuck on red — Ferozepur Rd",
        description: "Signal stuck on red for southbound traffic. Causing 30-min jams during evening rush.",
        category: "TRAFFIC" as const,
        status: "IN_PROGRESS" as const,
        priority: "URGENT" as const,
        location: "Ferozepur Rd × Walton Rd",
        area: "Cantt",
        lat: 31.52,
        lng: 74.38,
        photo: "https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?w=900&q=70",
        upvotes: 421,
        reporterId: user1.id,
      },
      {
        title: "Sewage overflow on side street",
        description: "Manhole overflowing, leaking into the lane. Has happened three monsoons in a row.",
        category: "SEWAGE" as const,
        status: "REPORTED" as const,
        priority: "MEDIUM" as const,
        location: "Wahdat Rd, behind market",
        area: "Iqbal Town",
        lat: 31.53,
        lng: 74.29,
        photo: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=900&q=70",
        upvotes: 67,
        reporterId: user2.id,
      },
      {
        title: "Pothole resolved — Mall Rd near GPO",
        description: "Repaired by City District Government within 5 days. Smooth tarmac restored.",
        category: "POTHOLE" as const,
        status: "RESOLVED" as const,
        priority: "MEDIUM" as const,
        location: "Mall Rd, near GPO Chowk",
        area: "Mall Road",
        lat: 31.56,
        lng: 74.31,
        photo: "https://images.unsplash.com/photo-1601933470928-c4adff8704e8?w=900&q=70",
        resolvedPhoto: "https://images.unsplash.com/photo-1601933470928-c4adff8704e8?w=900&q=70",
        upvotes: 211,
        reporterId: user3.id,
      },
    ];

    for (const issueData of issues) {
      const { timeline, ...issueRest } = issueData as any;
      await db.issue.create({
        data: {
          ...issueRest,
          timeline: {
            create: timeline ?? [
              { label: "Reported", done: true },
              { label: "Verified", done: false },
              { label: "In Progress", done: false },
              { label: "Resolved", done: false },
            ],
          },
        },
      });
    }
    console.log(`Created ${issues.length} seed issues.`);
  }

  // Seed a sample official comment
  const firstIssue = await db.issue.findFirst({ where: { category: "POTHOLE", status: "IN_PROGRESS" } });
  if (firstIssue) {
    const existingComment = await db.comment.findFirst({ where: { issueId: firstIssue.id, isOfficial: true } });
    if (!existingComment) {
      await db.comment.create({
        data: { issueId: firstIssue.id, authorId: admin.id, body: "Crew dispatched. Asphalt mix arrives by 4pm. Lane 2 will close briefly.", isOfficial: true },
      });
      await db.comment.create({
        data: { issueId: firstIssue.id, authorId: user2.id, body: "Saw a Suzuki bike skid here at 11pm. Please prioritize before more injuries." },
      });
    }
  }

  console.log("\nDone! Demo accounts:");
  console.log("  Admin: admin@maslasolve.pk / admin123");
  console.log("  Citizen: ayesha@example.com / password");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
