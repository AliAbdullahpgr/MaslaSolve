// Silence noisy "Effect version mismatch" warnings from uploadthing deps
const origWarn = console.warn;
console.warn = (...args) => {
  const s = typeof args[0] === "string" ? args[0] : "";
  if (s.includes("Effect versioned") || s.includes("language-service")) return;
  origWarn(...args);
};
const origLog = console.log;
console.log = (...args) => {
  const s = typeof args[0] === "string" ? args[0] : "";
  if (s.includes("Effect versioned") || s.includes("language-service")) return;
  origLog(...args);
};

import { UTApi, UTFile } from "uploadthing/server";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const IMAGES_DIR = join(ROOT, "public", "images");
const DATA_FILE = join(ROOT, "src", "lib", "data.tsx");

// Map local filename -> issue id in MSIssues
const MAPPING = {
  "crateer sized pothole.png": { id: "MS-2841", field: "photo" },
  "street lights out for three nights.png": { id: "MS-2839", field: "photo" },
  "Traffic signal stuck on red.png": { id: "MS-2830", field: "photo" },
  "Sewage overlow on side street.png": { id: "MS-2820", field: "photo" },
  "Pothole resolved — Mall Rd near GPO Afer.png": { id: "MS-2811", field: "photo" },
  "Pothole resolved — Mall Rd near GPO before.png": { id: "MS-2811", field: "photoBefore" },
};

async function main() {
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) throw new Error("UPLOADTHING_TOKEN missing in .env");

  const utapi = new UTApi({ token });

  const files = await readdir(IMAGES_DIR);
  const toUpload = files.filter((f) => MAPPING[f]);
  console.log(`Uploading ${toUpload.length} files...`);

  const utFiles = await Promise.all(
    toUpload.map(async (name) => {
      const buf = await readFile(join(IMAGES_DIR, name));
      const ext = extname(name).toLowerCase();
      const type = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
      return new UTFile([buf], name, { type });
    })
  );

  const results = await utapi.uploadFiles(utFiles);

  const urlByName = {};
  results.forEach((res, i) => {
    const name = toUpload[i];
    if (res.error) {
      console.error(`FAILED ${name}:`, res.error);
      return;
    }
    const url = res.data.ufsUrl ?? res.data.url;
    urlByName[name] = url;
    console.log(`OK ${name} -> ${url}`);
  });

  // Patch data.tsx: replace local /images/<name> paths with uploaded URLs
  let src = await readFile(DATA_FILE, "utf8");
  for (const [name, url] of Object.entries(urlByName)) {
    const localPath = `/images/${name}`;
    if (src.includes(localPath)) {
      src = src.split(localPath).join(url);
      console.log(`patched ${localPath}`);
    } else {
      console.warn(`local path not found in data.tsx: ${localPath}`);
    }
  }
  await writeFile(DATA_FILE, src, "utf8");
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
