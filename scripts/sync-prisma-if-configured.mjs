import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const schemaArg = process.argv[2] ?? "packages/db/prisma/schema.prisma";
const schema = resolve(process.cwd(), schemaArg);
const scriptDir = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.log("[prisma-sync] DATABASE_URL is not set; skipping schema sync.");
  process.exit(0);
}

console.log(`[prisma-sync] Syncing Prisma schema: ${schema}`);
execFileSync(
  "npx",
  ["prisma", "db", "push", "--schema", schema, "--skip-generate"],
  {
    stdio: "inherit",
  },
);

console.log("[prisma-sync] Cleaning Research Hub demo data.");
execFileSync(
  "node",
  [resolve(scriptDir, "cleanup-research-demo-data-if-configured.mjs")],
  {
    stdio: "inherit",
  },
);
