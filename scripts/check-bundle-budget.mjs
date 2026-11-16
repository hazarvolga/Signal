import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const assetsDir = new URL("../dist/assets/", import.meta.url);
const files = await readdir(assetsDir);
const mainBundle = files.find((file) => /^index-[^.]+\.js$/.test(file));
if (!mainBundle) throw new Error("Unable to identify the production entry bundle");

const mainBytes = (await stat(join(assetsDir.pathname, mainBundle))).size;
const mainBudgetBytes = 600 * 1024;
if (mainBytes > mainBudgetBytes) {
  throw new Error(
    `Entry bundle ${mainBundle} is ${(mainBytes / 1024).toFixed(2)} KB; budget is 600 KB`
  );
}

const routeBundles = [];
for (const file of files.filter((candidate) => candidate.endsWith(".js"))) {
  if (
    file.includes(".worker-") ||
    file.startsWith("vendor-") ||
    file.startsWith("index-")
  ) {
    continue;
  }
  const bytes = (await stat(join(assetsDir.pathname, file))).size;
  routeBundles.push({ file, bytes });
}
const oversizedRoute = routeBundles.find(({ bytes }) => bytes > 300 * 1024);
if (oversizedRoute) {
  throw new Error(
    `Route bundle ${oversizedRoute.file} is ${(oversizedRoute.bytes / 1024).toFixed(2)} KB; budget is 300 KB`
  );
}

console.log(
  JSON.stringify(
    {
      entry: { file: mainBundle, kilobytes: Number((mainBytes / 1024).toFixed(2)) },
      budgets: { entryKilobytes: 600, routeKilobytes: 300 },
      routeChunksChecked: routeBundles.length,
    },
    null,
    2
  )
);
