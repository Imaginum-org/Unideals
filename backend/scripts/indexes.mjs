// Compare the live MongoDB indexes with the ones declared in the models.
//
//   npm run indexes            dry run: lists indexes to create / drop
//   npm run indexes -- --apply create missing indexes AND drop undeclared ones
//
// Why: Mongoose (autoIndex) creates missing indexes on startup but never
// drops old ones, so indexes removed from a schema (redundant single-field
// indexes) keep slowing every write until dropped. Always run the dry run
// first: --apply also drops indexes someone created by hand in Atlas.
// Run it at a quiet time; index builds on big collections take a while.
import "dotenv/config";
import mongoose from "mongoose";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const apply = process.argv.includes("--apply");
const modelsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "models");

if (!process.env.MONGO_URL) {
  console.error("MONGO_URL is not set");
  process.exit(1);
}

// Load every model so mongoose.models is complete.
for (const file of readdirSync(modelsDir).filter((f) => f.endsWith(".js"))) {
  await import(pathToFileURL(path.join(modelsDir, file)).href);
}

await mongoose.connect(process.env.MONGO_URL, { autoIndex: false });
console.log(`${apply ? "APPLY" : "DRY RUN"} against ${mongoose.connection.host}/${mongoose.connection.name}\n`);

let creates = 0;
let drops = 0;
for (const name of Object.keys(mongoose.models).sort()) {
  const Model = mongoose.models[name];
  let diff;
  try {
    diff = await Model.diffIndexes();
  } catch (err) {
    console.log(`${name}: skipped (${err.message})`);
    continue;
  }
  const toCreate = diff.toCreate || [];
  const toDrop = diff.toDrop || [];
  if (!toCreate.length && !toDrop.length) continue;
  console.log(`${name} (${Model.collection.name})`);
  for (const spec of toCreate) console.log(`  + create ${JSON.stringify(spec)}`);
  for (const idx of toDrop) console.log(`  - drop   ${idx}`);
  creates += toCreate.length;
  drops += toDrop.length;
  if (apply) {
    const dropped = await Model.syncIndexes();
    console.log(`  applied (dropped: ${JSON.stringify(dropped)})`);
  }
}

console.log(`\n${creates} to create, ${drops} to drop${apply ? " (applied)" : ". Re-run with --apply to sync."}`);
await mongoose.disconnect();
