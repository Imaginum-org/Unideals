// Parses every backend source file with `node --check` so a syntax error
// fails CI before deploy. Does not execute the files.
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = ["server.js", "src", "scripts", "tests"];

const walk = (p) =>
  statSync(p).isDirectory()
    ? readdirSync(p).flatMap((f) => (f === "node_modules" ? [] : walk(path.join(p, f))))
    : /\.(m?js)$/.test(p)
      ? [p]
      : [];

const files = targets.flatMap((t) => walk(path.join(root, t)));
const bad = files.filter((f) => {
  const r = spawnSync(process.execPath, ["--check", f], { stdio: "inherit" });
  return r.status !== 0;
});

console.log(`${files.length - bad.length}/${files.length} files parsed OK`);
process.exit(bad.length ? 1 : 0);
