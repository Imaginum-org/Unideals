/*
 * Push smoke test.
 *
 *   node scripts/sendTestPush.js --check
 *       Verifies the Firebase credentials in .env by asking Google for an
 *       access token. Needs no database and sends nothing.
 *
 *   node scripts/sendTestPush.js you@college.edu      (or a user id)
 *       Sends a real push to every device that user registered.
 *       Open the site, log in and allow notifications first.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { cert } from "firebase-admin/app";

const arg = process.argv[2];
if (!arg) {
  console.log("Usage: node scripts/sendTestPush.js --check | <email or userId>");
  process.exit(1);
}

if (arg === "--check") {
  try {
    const credential = cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    });
    const { expires_in: expiresIn } = await credential.getAccessToken();
    console.log(`✓ Firebase credentials work (Google issued a token, valid ${expiresIn}s).`);
    console.log(`  PUSH_ENABLED=${process.env.PUSH_ENABLED || "(unset)"} — must be "true" for the app to send.`);
    process.exit(0);
  } catch (error) {
    console.error("✗ Firebase credentials rejected:", error?.message?.split("\n")[0]);
    process.exit(1);
  }
}

if (!process.env.MONGO_URL) {
  console.error("MONGO_URL required");
  process.exit(1);
}
process.env.PUSH_ENABLED = "true"; // this script is an explicit request to send

const { default: User } = await import("../src/models/User.model.js");
const { default: DeviceToken } = await import("../src/models/DeviceToken.model.js");
const { pushToUsers } = await import("../src/services/push.service.js");

await mongoose.connect(process.env.MONGO_URL);
const user = mongoose.Types.ObjectId.isValid(arg)
  ? await User.findById(arg).select("_id name").lean()
  : await User.findOne({ email: arg.toLowerCase() }).select("_id name").lean();
if (!user) {
  console.error("No user found for", arg);
  process.exit(1);
}

const devices = await DeviceToken.find({ user_id: user._id }).select("platform last_seen_at").lean();
console.log(`${user.name}: ${devices.length} registered device(s)`, devices.map((d) => d.platform));
if (!devices.length) {
  console.log("Nothing to send to. Log in on the site and click 'Turn on' under Notifications first.");
  process.exit(1);
}

const result = await pushToUsers([user._id], {
  id: "test",
  kind: "general",
  title: "Test push from Unideals 🎉",
  message: "If you can read this, system notifications work.",
  actionPath: "/notification",
  tag: "test-push",
});
console.log("Result:", result);
await mongoose.disconnect();
process.exit(result?.sent ? 0 : 1);
