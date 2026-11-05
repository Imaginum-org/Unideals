/* Backfill Girls Corner fields on existing docs. Idempotent. */
import mongoose from "mongoose";
import Product from "../src/models/Product.model.js";
import User from "../src/models/User.model.js";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required");
  process.exit(1);
}
await mongoose.connect(uri);
const r1 = await Product.updateMany(
  { isGirlsOnly: { $exists: false } },
  { $set: { isGirlsOnly: false } },
);
console.log("products isGirlsOnly backfilled:", r1?.modifiedCount ?? 0);
// Snapshot where seller is currently female and listing is girls-only w/o snapshot.
const missing = await Product.find({ isGirlsOnly: true, sellerGenderSnapshot: { $exists: false } }, { _id: 1, seller_id: 1 }).lean();
let fixed = 0;
for (const p of missing) {
  const s = await User.findById(p.seller_id).select("gender").lean();
  if (s?.gender === "female") {
    await Product.updateOne({ _id: p._id }, { $set: { sellerGenderSnapshot: "female" } });
    fixed += 1;
  }
}
console.log("snapshots fixed:", fixed);
await mongoose.disconnect();
