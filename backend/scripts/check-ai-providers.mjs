// Run: node scripts/check-ai-providers.mjs   (from backend/)
// Checks that the assistant's AI providers work with the keys in .env:
// one tiny call to every configured model, plus the chat models your Groq key
// can use (handy when Groq retires a model and GROQ_MODELS needs updating).
import "dotenv/config";
import ai from "../src/config/gemini.js";
import { CANDIDATE_MODELS, aiProviderStatus } from "../src/services/assistant.gemini.js";
import { groqGenerate } from "../src/services/assistant.groq.js";

const ping = { contents: [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }], config: { maxOutputTokens: 20 } };

const check = async (model) => {
  const started = Date.now();
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("no answer in 15s")), 15000));
    const call = model.startsWith("groq:")
      ? groqGenerate(ping, model.slice(5))
      : ai.models.generateContent({ ...ping, model });
    const response = await Promise.race([call, timeout]);
    return `ok    ${String(Date.now() - started).padStart(5)}ms  ${JSON.stringify(String(response.text || "").trim().slice(0, 20))}`;
  } catch (error) {
    return `FAIL  ${String(Date.now() - started).padStart(5)}ms  ${String(error.status || "")} ${String(error.message || error).split("\n")[0].slice(0, 110)}`;
  }
};

console.log("Keys:", aiProviderStatus());
console.log("\nChain the assistant walks, in order:");
for (const model of CANDIDATE_MODELS) {
  const provider = model.startsWith("groq:") ? "groq" : "gemini";
  if (aiProviderStatus()[provider] === "no key") {
    console.log(`  ${model.padEnd(36)} skipped (no ${provider.toUpperCase()}_API_KEY)`);
    continue;
  }
  console.log(`  ${model.padEnd(36)} ${await check(model)}`);
}

if (process.env.GROQ_API_KEY) {
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}` },
  }).catch((error) => ({ ok: false, status: error.message }));
  if (response.ok) {
    const { data } = await response.json();
    const chat = data
      .map((m) => m.id)
      .filter((id) => !/whisper|guard|orpheus|tts|playai/i.test(id))
      .sort();
    console.log(`\nChat models your Groq key can use (set GROQ_MODELS to change the order):\n  ${chat.join("\n  ")}`);
  } else {
    console.log(`\nCould not list Groq models (${response.status}).`);
  }
}
process.exit(0);
