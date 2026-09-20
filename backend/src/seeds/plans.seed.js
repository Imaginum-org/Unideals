import { SUBSCRIPTION_PLANS, ACTIVE_SUBSCRIPTION_TYPE } from "../config/subscriptionPlans.js";
import { USER_TIER } from "../config/constants.js";

// Verification seed: asserts the plan catalog is internally consistent.
// Run: node src/seeds/plans.seed.js
// Exits non-zero on any inconsistency (CI gate friendly).
const assert = (cond, message) => {
  if (!cond) {
    console.error(`PLAN SEED CHECK FAILED: ${message}`);
    process.exitCode = 1;
  }
};

console.log(`Active subscription type: ${ACTIVE_SUBSCRIPTION_TYPE}`);

const free = SUBSCRIPTION_PLANS[USER_TIER.BASE_USER];
assert(free.amountInPaise === 0, "Free plan must cost 0");
assert(free.activeListings === 10, "Free activeListings must be 10");
assert(free.wishlistLimit === 25, "Free wishlistLimit must be 25");

for (const tier of [USER_TIER.PRO, USER_TIER.PRO_PLUS]) {
  const plan = SUBSCRIPTION_PLANS[tier]?.[ACTIVE_SUBSCRIPTION_TYPE];
  assert(plan, `${tier} must define a ${ACTIVE_SUBSCRIPTION_TYPE} variant`);
  assert(plan.amountInPaise > 0, `${tier} must have a positive amount`);
  assert(
    Number.isInteger(plan.amountInPaise),
    `${tier} amount must be integer paise`,
  );
  console.log(
    `- ${plan.displayName}: ₹${plan.amountInPaise / 100} (${plan.subscriptionType}, lifetime=${plan.isLifetime})`,
  );
}

if (!process.exitCode) {
  console.log("Plan catalog consistent.");
}
