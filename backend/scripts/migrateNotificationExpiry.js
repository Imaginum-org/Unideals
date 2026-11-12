/*
 * One-off, idempotent: move notification retention from createdAt to expires_at.
 *
 *   MONGO_URL=... node scripts/migrateNotificationExpiry.js
 *
 * Why: the old TTL index on notifications.createdAt deleted any campaign
 * 30 days after it was WRITTEN, including scheduled ones that hadn't been
 * sent yet. Mongoose creates the new expires_at TTL index on boot but never
 * drops the old one, so it must be removed here.
 *
 * Order matters: backfill first (so nothing is left without an expiry),
 * then drop the old index.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Notification, { NOTIFICATION_RETENTION_DAYS } from "../src/models/Notification.model.js";

const uri = process.env.MONGO_URL;
if (!uri) {
  console.error("MONGO_URL required");
  process.exit(1);
}
await mongoose.connect(uri);

const retentionMs = NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

// Sent rows: sent_at = createdAt (best available), expires_at = sent_at + retention.
const sent = await Notification.collection.updateMany(
  { status: "sent", sent_at: { $in: [null] } },
  [
    { $set: { sent_at: "$createdAt" } },
    { $set: { expires_at: { $add: ["$createdAt", retentionMs] } } },
  ],
);
console.log("sent rows backfilled:", sent.modifiedCount);

// Cancelled / failed / leftover draft rows: expire on the same clock.
const closed = await Notification.collection.updateMany(
  { status: { $in: ["cancelled", "failed", "draft"] }, expires_at: { $in: [null] } },
  [{ $set: { expires_at: { $add: ["$createdAt", retentionMs] } } }],
);
console.log("closed rows given an expiry:", closed.modifiedCount);

const indexes = await Notification.collection.indexes();
const legacy = indexes.find((i) => i.key?.createdAt === 1 && i.expireAfterSeconds != null);
if (legacy) {
  await Notification.collection.dropIndex(legacy.name);
  console.log("dropped legacy TTL index:", legacy.name);
} else {
  console.log("legacy TTL index already gone");
}
await Notification.createIndexes();
console.log("new indexes ensured");

await mongoose.disconnect();
