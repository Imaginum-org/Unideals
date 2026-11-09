import { findKnowledgeBaseAnswer, formatKnowledgeReply, UNKNOWN_KB_FALLBACK } from "../src/services/assistant.knowledge.js";
import { getKnowledgeSnippet, UNKNOWN_QUESTION_FALLBACK } from "../src/config/knowledgeBase.js";
import { toolHandlers } from "../src/services/assistant.tools.js";

console.log("=== UniDeals Policy & Procedure Knowledge Verification Suite ===\n");

const testCases = [
  // 1. Extreme Basic: Platform Identity & Eligibility
  { query: "what is unideals", expectedId: "what_is_unideals", type: "KB" },
  { query: "who can use unideals", expectedId: "who_can_use", type: "KB" },
  { query: "can alumni or faculty use unideals", expectedId: "who_can_use", type: "KB" },
  { query: "is unideals free or is there any commission", expectedId: "is_it_free", type: "KB" },

  // 2. Prohibited Items & Activities (Basic to Extreme Advanced)
  { query: "what items are prohibited on unideals", expectedId: "prohibited_items", type: "KB" },
  { query: "can i sell exam papers or leaked questions", expectedId: "prohibited_items", type: "KB" },
  { query: "can i sell alcohol, medicines or cigarettes", expectedId: "prohibited_items", type: "KB" },
  { query: "is bulk dropshipping or commercial reselling allowed", expectedId: "prohibited_items", type: "KB" },

  // 3. Selling & Price Rules
  { query: "how do i sell a product on unideals", expectedId: "sell_upload_steps", type: "KB" },
  { query: "can i list an item for a price higher than original mrp", expectedId: "listing_price_rules", type: "KB" },
  { query: "how many items can i list on the free plan", expectedId: "listing_limits", type: "KB" },

  // 4. Buying, Safety & Scams
  { query: "how do i buy something", expectedId: "buy_steps", type: "KB" },
  { query: "is advance upi payment safe before meeting", expectedId: "payment_safety_advance", type: "KB" },
  { query: "what is the reverse qr code scam", expectedId: "reverse_qr_scam", type: "KB" },
  { query: "where is the best safe place to meet on campus", expectedId: "pickup_tips", type: "KB" },

  // 5. Deal Workflow & Lifecycle
  { query: "what are the stages in a deal workflow", expectedId: "deal_workflow_steps", type: "KB" },

  // 6. Subscriptions & Boosts
  { query: "compare the subscription plans free vs pro vs pro plus", expectedId: "pricing_subscription_steps", type: "KB" },
  { query: "how to boost a listing to sell faster", expectedId: "boosting_steps", type: "KB" },
  { query: "can i stack multiple boosts on the same listing", expectedId: "boost_rules", type: "KB" },
  { query: "do unused boost credits carry over to next month", expectedId: "boost_rules", type: "KB" },
  { query: "is the founder offer lifetime access really lifetime", expectedId: "founder_offer", type: "KB" },

  // 7. Policies: Returns, Moderation, Privacy, Liability, Reviews
  { query: "what is the return and refund policy if item is broken", expectedId: "return_refund", type: "KB" },
  { query: "what happens if an account violates rules moderation penalty", expectedId: "moderation_penalties", type: "KB" },
  { query: "what is the platform liability cap under indian law", expectedId: "platform_liability", type: "KB" },
  { query: "what is your privacy policy and dpdp compliance", expectedId: "privacy_overview", type: "KB" },
  { query: "how long does account deletion take", expectedId: "delete_account", type: "KB" },
  { query: "what is the review and rating policy", expectedId: "reviews_ratings", type: "KB" },
  { query: "does unideals provide home delivery or courier shipping", expectedId: "no_delivery", type: "KB" },

  // 8. Support & Account Help
  { query: "how do i contact support or file a complaint", expectedId: "contact_support_steps", type: "KB" },
  { query: "forgot my password how do i reset it", expectedId: "forgot_password", type: "KB" },
];

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const match = findKnowledgeBaseAnswer(test.query);
  if (match && match.id === test.expectedId) {
    console.log(`✓ PASS: "${test.query}" -> ${match.id} (confidence: ${match.confidence})`);
    passed++;
  } else {
    console.error(`✗ FAIL: "${test.query}" -> Expected "${test.expectedId}", got "${match?.id || 'none'}"`);
    failed++;
  }
}

// 9. Verify Tool Handlers: getPolicyOrProcedure
console.log("\n--- Testing getPolicyOrProcedure Tool Handler ---");
const policyTopics = [
  "returns_refunds",
  "reviews_ratings",
  "privacy_data",
  "subscription_rules",
  "boost_rules",
  "moderation_penalties",
  "dispute_resolution",
  "account_security",
  "content_photo_rules",
  "deal_lifecycle",
  "payment_safety",
  "listing_price_rules",
  "prohibited_items",
  "eligibility",
  "platform_liability",
  "governing_law",
  "subscription_upgrade_policy",
  "founder_offer",
];

let toolPassed = 0;
for (const topic of policyTopics) {
  const res = await toolHandlers.getPolicyOrProcedure({ topic });
  if (res && res.policy && res.policy.title) {
    console.log(`✓ PASS Tool: topic "${topic}" -> "${res.policy.title}"`);
    toolPassed++;
  } else {
    console.error(`✗ FAIL Tool: topic "${topic}" failed to return policy`);
  }
}

// 10. Verify Graceful Fallback for completely unknown questions
console.log("\n--- Testing Graceful Fallback for Unknown Questions ---");
const unknownQuery = "What is the quantum mechanics syllabus for semester 4?";
const unknownMatch = findKnowledgeBaseAnswer(unknownQuery);
const snippetMatch = getKnowledgeSnippet(unknownQuery);

console.log(`Unknown Query: "${unknownQuery}"`);
console.log(`findKnowledgeBaseAnswer result: ${unknownMatch ? unknownMatch.id : "null (correct!)"}`);
console.log(`getKnowledgeSnippet result: ${snippetMatch ? snippetMatch.type : "null (correct!)"}`);

if (!unknownMatch && !snippetMatch) {
  console.log("✓ PASS: Unknown question correctly produced NO match in knowledge base!");
  console.log(`✓ Graceful fallback template: "${UNKNOWN_KB_FALLBACK.reply.slice(0, 100)}..."`);
  console.log(`✓ Fallback contact route: ${UNKNOWN_KB_FALLBACK.route}`);
} else {
  console.error("✗ FAIL: Unknown question unexpectedly matched something!");
}

console.log(`\n========================================`);
console.log(`Results: ${passed}/${testCases.length} Knowledge tests passed.`);
console.log(`Results: ${toolPassed}/${policyTopics.length} Policy tool topics passed.`);
console.log(`========================================\n`);

if (failed > 0 || toolPassed !== policyTopics.length) {
  process.exit(1);
} else {
  console.log("🎉 ALL TESTS PASSED PERFECTLY!");
}
