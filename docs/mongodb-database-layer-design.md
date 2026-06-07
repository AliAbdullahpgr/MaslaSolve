# MaslaSolve MongoDB Database Layer Design (Detailed)

## 1) Context and Goal

MaslaSolve currently uses Prisma with PostgreSQL.  
This document describes how the same application behavior would be implemented with MongoDB, including:

- collection design
- document schema/validation
- read/write query patterns
- index strategy
- transaction boundaries
- aggregation and geo queries
- embedding storage and duplicate detection

The goal is functional parity with existing routes and features.

---

## 2) Data Model Mapping (PostgreSQL/Prisma ➜ MongoDB)

Current logical entities:

- `User`
- `Account` (auth provider mapping)
- `Session`
- `VerificationToken`
- `Issue`
- `Comment`
- `Vote`
- `TimelineItem`

MongoDB equivalent collections:

- `users`
- `accounts`
- `sessions`
- `verificationTokens`
- `issues`
- `comments` (or embedded in `issues`, see modeling options)
- `votes`
- `timelineItems` (or embedded in `issues`)

---

## 3) Modeling Strategy

### Option A (recommended for parity and flexibility): **Hybrid referenced model**

- Keep primary write entities as separate collections (`issues`, `comments`, `votes`).
- Optionally embed small, append-only timeline items in `issues.timeline`.
- Keep auth collections separate for NextAuth adapter compatibility.

Why:

- Preserves current API behavior and pagination options.
- Avoids very large issue documents if comments grow.
- Keeps vote uniqueness enforceable with a compound unique index.

### Option B: **More embedded model**

- Embed comments and timeline directly in `issues`.
- Keep votes as embedded userId array or separate `votes` collection.

Tradeoff:

- Faster single-document reads for issue detail.
- Harder to paginate/filter comments and enforce vote uniqueness at scale.

---

## 4) Proposed Collection Schemas

> `_id` is MongoDB `ObjectId` by default.  
> If strict string IDs are required to mimic `cuid`, use string `_id` values; otherwise keep native `ObjectId`.

## 4.1 `users`

```json
{
  "_id": { "$oid": "..." },
  "name": "Ayesha",
  "email": "ayesha@example.com",
  "emailVerified": { "$date": "..." },
  "password": "<bcrypt-hash>",
  "image": "https://...",
  "phone": "+92...",
  "role": "CITIZEN",
  "createdAt": { "$date": "..." },
  "updatedAt": { "$date": "..." }
}
```

### Validation notes

- `email` optional but unique when present.
- `role` enum: `CITIZEN | ADMIN | CREW`.

## 4.2 `issues`

```json
{
  "_id": { "$oid": "..." },
  "title": "Large pothole near GPO",
  "description": "Deep crater causing traffic disruptions.",
  "category": "POTHOLE",
  "status": "REPORTED",
  "priority": "MEDIUM",
  "location": "Mall Road near GPO",
  "area": "Anarkali",
  "geo": {
    "type": "Point",
    "coordinates": [74.314, 31.565]
  },
  "lat": 31.565,
  "lng": 74.314,
  "photo": "https://...",
  "resolvedPhoto": "https://...",
  "embedding": [0.012, -0.443, 0.891],
  "upvotes": 12,
  "views": 0,
  "isAnonymous": false,
  "reporterId": { "$oid": "..." },
  "timeline": [
    { "label": "Reported", "done": true, "note": null, "timestamp": { "$date": "..." } },
    { "label": "Verified", "done": false, "note": null, "timestamp": { "$date": "..." } }
  ],
  "createdAt": { "$date": "..." },
  "updatedAt": { "$date": "..." }
}
```

### Validation notes

- `category` enum: `POTHOLE | GARBAGE | TRAFFIC | STREETLIGHT | SEWAGE | WATER | OTHER`
- `status` enum: `REPORTED | IN_PROGRESS | RESOLVED | REJECTED`
- `priority` enum: `URGENT | HIGH | MEDIUM | LOW`
- `embedding` optional array of numbers.

## 4.3 `comments`

```json
{
  "_id": { "$oid": "..." },
  "issueId": { "$oid": "..." },
  "authorId": { "$oid": "..." },
  "body": "Crew has started work.",
  "upvotes": 0,
  "isOfficial": true,
  "createdAt": { "$date": "..." },
  "updatedAt": { "$date": "..." }
}
```

## 4.4 `votes`

```json
{
  "_id": { "$oid": "..." },
  "issueId": { "$oid": "..." },
  "userId": { "$oid": "..." },
  "createdAt": { "$date": "..." }
}
```

Unique pair required: `(issueId, userId)`.

## 4.5 Auth collections

`accounts`, `sessions`, and `verificationTokens` mirror NextAuth adapter fields as separate collections.

---

## 5) Index Strategy

## 5.1 Core indexes (`issues`)

```javascript
db.issues.createIndex({ status: 1 });
db.issues.createIndex({ category: 1 });
db.issues.createIndex({ area: 1 });
db.issues.createIndex({ createdAt: -1 });
db.issues.createIndex({ priority: 1, createdAt: -1 });
db.issues.createIndex({ reporterId: 1, createdAt: -1 });
```

## 5.2 Geo index (`issues`)

```javascript
db.issues.createIndex({ geo: "2dsphere" });
```

Use this for nearby issue discovery instead of bounding-box-only filters when precision is needed.

## 5.3 Relationship and query indexes

```javascript
db.comments.createIndex({ issueId: 1, createdAt: -1 });
db.votes.createIndex({ issueId: 1, userId: 1 }, { unique: true });
db.votes.createIndex({ userId: 1, createdAt: -1 });
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
db.sessions.createIndex({ sessionToken: 1 }, { unique: true });
db.verificationTokens.createIndex({ token: 1 }, { unique: true });
```

## 5.4 Optional text/search indexes

```javascript
db.issues.createIndex({ title: "text", description: "text", location: "text", area: "text" });
```

If Atlas Search is available, prefer Atlas Search index for better multilingual/fuzzy matching.

---

## 6) Route-to-Query Mapping (Read/Write)

Below maps existing API behavior to MongoDB operations.

## 6.1 `GET /api/issues` (filtered list)

```javascript
const filter = {
  ...(status ? { status } : {}),
  ...(category ? { category } : {}),
  ...(area ? { area } : {}),
  ...(priority ? { priority } : {})
};

const issues = await db.collection("issues")
  .find(filter)
  .sort({ createdAt: -1 })
  .limit(100)
  .toArray();
```

If returning reporter and counts in one call, use `$lookup` + `$addFields` in an aggregation pipeline.

## 6.2 `POST /api/issues` (create issue + initial timeline)

```javascript
await db.collection("issues").insertOne({
  title, description, category, priority, location, area,
  lat, lng,
  geo: lat != null && lng != null ? { type: "Point", coordinates: [lng, lat] } : null,
  photo, resolvedPhoto: null, embedding,
  status: "REPORTED",
  upvotes: 0, views: 0, isAnonymous, reporterId,
  timeline: [
    { label: "Reported", done: true, timestamp: new Date() },
    { label: "Verified", done: false, timestamp: new Date() },
    { label: "In Progress", done: false, timestamp: new Date() },
    { label: "Resolved", done: false, timestamp: new Date() }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
});
```

## 6.3 `GET /api/issues/[id]` (detail with comments + reporter)

Aggregation example:

```javascript
db.issues.aggregate([
  { $match: { _id: issueId } },
  { $lookup: {
      from: "users",
      localField: "reporterId",
      foreignField: "_id",
      as: "reporter"
  }},
  { $lookup: {
      from: "comments",
      let: { issueId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$issueId", "$$issueId"] } } },
        { $sort: { createdAt: -1 } }
      ],
      as: "comments"
  }},
  { $addFields: {
      reporter: { $first: "$reporter" },
      voteCount: { $size: { $ifNull: ["$votes", []] } }
  }}
]);
```

Alternative: fetch issue, comments, and vote count using separate indexed queries for lower complexity.

## 6.4 `PATCH /api/issues/[id]` (partial update)

```javascript
await db.collection("issues").updateOne(
  { _id: issueId },
  { $set: { ...allowedFields, updatedAt: new Date() } }
);
```

## 6.5 `DELETE /api/issues/[id]`

Use a transaction if deleting issue + comments + votes together:

```javascript
const session = client.startSession();
await session.withTransaction(async () => {
  await db.collection("issues").deleteOne({ _id: issueId }, { session });
  await db.collection("comments").deleteMany({ issueId }, { session });
  await db.collection("votes").deleteMany({ issueId }, { session });
});
```

## 6.6 `POST /api/issues/[id]/comments`

```javascript
await db.collection("comments").insertOne({
  issueId, authorId, body, isOfficial: !!isOfficial,
  upvotes: 0, createdAt: new Date(), updatedAt: new Date()
});
```

## 6.7 `POST /api/issues/[id]/vote` (toggle + upvote counter)

Atomic pattern with transaction:

```javascript
await session.withTransaction(async () => {
  const existing = await db.collection("votes").findOne({ issueId, userId }, { session });
  if (existing) {
    await db.collection("votes").deleteOne({ _id: existing._id }, { session });
    await db.collection("issues").updateOne({ _id: issueId }, { $inc: { upvotes: -1 } }, { session });
  } else {
    await db.collection("votes").insertOne({ issueId, userId, createdAt: new Date() }, { session });
    await db.collection("issues").updateOne({ _id: issueId }, { $inc: { upvotes: 1 } }, { session });
  }
});
```

Then enforce auto-escalation:

```javascript
await db.collection("issues").updateOne(
  { _id: issueId, upvotes: { $gte: 50 }, priority: { $ne: "URGENT" } },
  { $set: { priority: "URGENT", updatedAt: new Date() } }
);
```

## 6.8 `GET /api/issues/nearby`

Current behavior can be replicated with bbox filter:

```javascript
db.issues.find({
  lat: { $gte: lat - 0.0045, $lte: lat + 0.0045 },
  lng: { $gte: lng - 0.0045, $lte: lng + 0.0045 },
  status: { $ne: "RESOLVED" }
});
```

Preferred geo query:

```javascript
db.issues.find({
  status: { $ne: "RESOLVED" },
  geo: {
    $near: {
      $geometry: { type: "Point", coordinates: [lng, lat] },
      $maxDistance: 500
    }
  }
});
```

## 6.9 `GET /api/issues/similar` (embedding duplicate detection)

Filter candidates by category + area/geo + recency:

```javascript
const candidates = await db.collection("issues").find({
  _id: { $ne: excludeId },
  status: { $ne: "RESOLVED" },
  category,
  createdAt: { $gte: thirtyDaysAgo },
  ...(hasCoords
    ? { geo: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 2000 } } }
    : { area })
}).limit(60).toArray();
```

Compute cosine similarity in application layer and return top threshold matches.

---

## 7) JSON Schema Validation (Collection Validators)

Example validator for `issues`:

```javascript
db.runCommand({
  collMod: "issues",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "category", "status", "priority", "location", "area", "createdAt", "updatedAt"],
      properties: {
        title: { bsonType: "string", minLength: 1 },
        description: { bsonType: "string" },
        category: { enum: ["POTHOLE", "GARBAGE", "TRAFFIC", "STREETLIGHT", "SEWAGE", "WATER", "OTHER"] },
        status: { enum: ["REPORTED", "IN_PROGRESS", "RESOLVED", "REJECTED"] },
        priority: { enum: ["URGENT", "HIGH", "MEDIUM", "LOW"] },
        location: { bsonType: "string" },
        area: { bsonType: "string" },
        lat: { bsonType: ["double", "null"] },
        lng: { bsonType: ["double", "null"] },
        upvotes: { bsonType: "int", minimum: 0 },
        isAnonymous: { bsonType: "bool" },
        embedding: { bsonType: ["array"], items: { bsonType: ["double", "int"] } }
      }
    }
  },
  validationLevel: "moderate"
});
```

---

## 8) Transactions and Consistency Rules

Use MongoDB transactions for multi-document invariants:

- vote toggle + issue upvote counter
- issue delete cascade (issue/comments/votes)
- any future workflow that updates issue status + timeline + audit log together

Without transaction, data drift can happen (example: vote removed but counter not decremented).

---

## 9) Performance Guidance

- Always paginate issue lists (`limit` + cursor/id-based pagination for scale).
- Keep projection minimal (`find({}, { projection: ... })`).
- Use compound indexes aligned with actual filter + sort combinations.
- Avoid heavy `$lookup` in hot paths when two indexed queries are simpler.
- Archive very old resolved issues if collection growth becomes large.

---

## 10) Security and Data Hygiene

- Keep `password` as bcrypt hash only.
- Never expose password hash in projections.
- Validate and sanitize user-generated text before persistence.
- Restrict update payloads to explicit allowlists (as current API does).
- Keep authorization checks in API layer (citizen vs admin vs crew).

---

## 11) Migration Plan (Prisma/PostgreSQL ➜ MongoDB)

1. Create Mongo collections + validators + indexes.
2. Export relational data by entity (`users`, `issues`, `comments`, `votes`, auth tables).
3. Transform IDs and foreign keys to Mongo references.
4. Backfill `geo` from `lat/lng`.
5. Recompute or copy embeddings.
6. Run parity checks on counts and random sample records.
7. Switch application DB adapter layer.
8. Run dual-read smoke tests for key routes.

---

## 12) Minimal Repository Integration Pattern

A Mongo equivalent of current singleton DB module (`src/server/db.ts`) would expose a shared `db` object from one `MongoClient` instance and be reused by all API routes to avoid connection churn.

This keeps route structure unchanged while replacing Prisma model calls with Mongo collection operations.
