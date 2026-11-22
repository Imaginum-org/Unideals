// Rent & Borrow: set a campus's hostel block list (so students pick, not type).
//
//   npm run seed:rent-blocks -- --campus=vit-vellore --blocks=A-T
//   npm run seed:rent-blocks -- --campus=vit-vellore --blocks="A-T,LH A-LH H"
//   npm run seed:rent-blocks -- --campus=vit-vellore --blocks="Boys Hostel 1,Girls Hostel 2"
//
// "A-T" expands to "Block A" … "Block T"; "LH A-LH H" expands to "LH A" … "LH H".
// Anything else is used as written. Replaces the campus's list; safe to re-run.
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Campus from "../models/Campus.model.js";
import RentCampusConfig from "../models/RentCampusConfig.model.js";
import { cleanBlocks } from "../services/rentAdmin.service.js";

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const expand = (part) => {
  const single = part.match(/^([A-Za-z])\s*-\s*([A-Za-z])$/);
  if (single) return range("Block ", single[1], single[2]);
  const prefixed = part.match(/^(.*\S)\s+([A-Za-z])\s*-\s*\1\s+([A-Za-z])$/);
  if (prefixed) return range(`${prefixed[1]} `, prefixed[2], prefixed[3]);
  return [part];
};

const range = (prefix, from, to) => {
  const a = from.toUpperCase().charCodeAt(0);
  const b = to.toUpperCase().charCodeAt(0);
  const out = [];
  for (let c = Math.min(a, b); c <= Math.max(a, b); c++) out.push(`${prefix}${String.fromCharCode(c)}`);
  return out;
};

const run = async () => {
  const slug = arg("campus");
  const spec = arg("blocks");
  if (!slug || !spec) {
    console.error('Usage: npm run seed:rent-blocks -- --campus=<slug> --blocks="A-T"');
    process.exit(1);
  }
  if (!process.env.MONGO_URL) {
    console.error("MONGO_URL not found in .env file");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URL, { family: 4 });

  const campus = await Campus.findOne({ slug: slug.toLowerCase() }).lean();
  if (!campus) throw new Error(`No campus with slug "${slug}"`);

  const blocks = cleanBlocks(spec.split(",").map((p) => p.trim()).filter(Boolean).flatMap(expand));
  const config = await RentCampusConfig.findOneAndUpdate(
    { campus_id: campus._id },
    { $set: { blocks } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();

  console.log(`${campus.name}: ${config.blocks.length} blocks (${config.enabled ? "enabled" : "paused"})`);
  console.log(config.blocks.join(", "));
  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("Rent blocks seed failed:", error.message);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
