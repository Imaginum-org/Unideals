import 'dotenv/config';
import mongoose from 'mongoose';
import { buildAssistantReply } from '../src/services/assistant.service.js';

const tests = [
  'recommend books for students',
  'find hostel essentials for a room',
  'show me a power bank on the website',
  'I am going on a hill trip and need items to carry',
  'I am going on an exam trip and need what to bring',
  'recommend something similar to a travel pillow',
  'suggest bikes and safety gear',
];

try {
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 5000 });

  for (const q of tests) {
    try {
      const result = await buildAssistantReply({ message: q });
      const list = Array.isArray(result.productCards)
        ? result.productCards
        : Array.isArray(result.products)
          ? result.products
          : [];

      console.log(`${q} => ${result.intent} :: ${list.length}`);
    } catch (error) {
      console.error(`ERR: ${q} => ${error.message}`);
    }
  }
} catch (error) {
  console.error(`DB_CONNECT_ERROR: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
