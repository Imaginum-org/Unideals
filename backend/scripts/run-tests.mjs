// Runs every integration suite in tests/ one after another.
// Each suite starts its own in-memory MongoDB, so they run sequentially to
// keep memory low. Exits 1 if any suite fails.
//
//   npm test                 # all suites
//   npm test -- deals plans  # only suites whose file name contains a filter
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = path.join(root, "tests");
const filters = process.argv.slice(2);

const suites = readdirSync(testsDir)
  .filter((f) => f.endsWith(".test.mjs"))
  .filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
  .sort();

if (suites.length === 0) {
  console.error("No test suites matched.");
  process.exit(1);
}

const failed = [];
const started = Date.now();
for (const suite of suites) {
  console.log(`\n━━━ ${suite}`);
  const result = spawnSync(process.execPath, [path.join(testsDir, suite)], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "test" },
  });
  if (result.status !== 0) failed.push(suite);
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${suites.length - failed.length}/${suites.length} suites passed in ${secs}s`);
if (failed.length) {
  console.error(`Failed: ${failed.join(", ")}`);
  process.exit(1);
}
