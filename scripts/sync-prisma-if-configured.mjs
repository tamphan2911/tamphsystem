import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const schemaArg = process.argv[2] ?? "packages/db/prisma/schema.prisma";
const schema = resolve(process.cwd(), schemaArg);

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
