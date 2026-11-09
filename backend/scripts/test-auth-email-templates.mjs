import assert from "node:assert/strict";
import forgotPasswordTemplate from "../src/utils/templates/forgotPaswordTemplate.js";
import verifyEmailTemplate from "../src/utils/templates/verifyEmailTemplate.js";

const resetUrl = "https://unideals.in/reset-password/test-token";
const verifyUrl = "https://unideals.in/verify-email?code=test-token";

const resetEmail = forgotPasswordTemplate({
  name: "<Kam>",
  resetUrl,
});
assert.match(resetEmail, /Reset your password/);
assert.match(resetEmail, /15 minutes/);
assert.match(resetEmail, /href="https:\/\/unideals\.in\/reset-password\/test-token"/);
assert.match(resetEmail, /&lt;Kam&gt;/);
assert.match(resetEmail, /https:\/\/unideals\.in\/privacy-policy/);
assert.match(resetEmail, /https:\/\/unideals\.in\/termscondition/);
assert.doesNotMatch(resetEmail, /href="#"/);

const verificationEmail = verifyEmailTemplate({
  name: "Kam",
  url: verifyUrl,
});
assert.match(verificationEmail, /Verify your email address/);
assert.match(verificationEmail, /24 hours/);
assert.match(verificationEmail, /href="https:\/\/unideals\.in\/verify-email\?code=test-token"/);
assert.match(verificationEmail, /Kam/);
assert.match(verificationEmail, /https:\/\/unideals\.in\/privacy-policy/);
assert.match(verificationEmail, /https:\/\/unideals\.in\/termscondition/);
assert.doesNotMatch(verificationEmail, /href="#"/);

console.log("Password-reset and email-verification templates passed.");
