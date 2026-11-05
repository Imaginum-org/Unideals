// Campus directory seed — idempotent upsert of the launch campuses.
// Run: npm run seed:campuses  (or: node src/seeds/campuses.seed.js)
// Safe to re-run: matches on immutable slug, only fills the rest.
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Campus from "../models/Campus.model.js";

const CAMPUSES = [
  {
    slug: "vit-vellore",
    name: "VIT Vellore",
    short_name: "Vellore",
    city: "Vellore",
    state: "Tamil Nadu",
    email_domains: ["vit.ac.in"],
  },
  {
    slug: "vit-chennai",
    name: "VIT Chennai",
    short_name: "Chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    email_domains: ["vit.ac.in"],
  },
  {
    slug: "vit-bhopal",
    name: "VIT Bhopal",
    short_name: "Bhopal",
    city: "Sehore",
    state: "Madhya Pradesh",
    email_domains: ["vitbhopal.ac.in"],
  },
  {
    slug: "vit-amaravati",
    name: "VIT Amaravati",
    short_name: "Amaravati",
    city: "Amaravati",
    state: "Andhra Pradesh",
    email_domains: ["vitap.ac.in"],
  },
];

const run = async () => {
  if (!process.env.MONGO_URL) {
    console.error("MONGO_URL not found in .env file");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URL, { family: 4 });

  for (const data of CAMPUSES) {
    const campus = await Campus.findOneAndUpdate(
      { slug: data.slug },
      { $setOnInsert: data, $set: { is_active: true } },
      { returnDocument: "after", upsert: true, runValidators: true },
    ).lean();
    console.log(`- ${campus.slug}: ${campus.name} (${campus._id})`);
  }

  const total = await Campus.countDocuments({});
  console.log(`Campus seed complete. Total campuses: ${total}.`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("Campus seed failed:", error.message);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
