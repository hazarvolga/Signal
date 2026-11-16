import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const distDir = new URL("../dist/", import.meta.url);
const forbiddenNames = [
  "DATABASE_URL",
  "REDIS_URL",
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "GEMINI_API_KEY",
  "OBJECT_STORAGE_ACCESS_KEY_ID",
  "OBJECT_STORAGE_SECRET_ACCESS_KEY",
  "EMAIL_TRACKING_SECRET",
];
const configuredSecretValues = forbiddenNames
  .map((name) => process.env[name])
  .filter((value) => typeof value === "string" && value.length >= 12);

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesBelow(path) : [path];
    })
  );
  return nested.flat();
}

const scannedExtensions = new Set([".html", ".js", ".css", ".map"]);
for (const file of await filesBelow(distDir.pathname)) {
  if (!scannedExtensions.has(extname(file))) continue;
  const content = await readFile(file, "utf8");
  const exposedName = forbiddenNames.find((name) => content.includes(name));
  const exposedValue = configuredSecretValues.find((value) => content.includes(value));
  if (exposedName || exposedValue) {
    throw new Error(
      `Potential server secret exposure detected in ${file.replace(distDir.pathname, "dist/")}`
    );
  }
}

console.log("Client bundle secret scan passed");
