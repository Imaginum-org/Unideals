// Masks contact and payment details before text is stored (assistant chat
// history). Order matters: emails first, so "name@bank" UPI handles aren't
// confused with the local part of an email address.
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi;
const UPI_ID = /\b[A-Z0-9._-]{2,}@[A-Z]{2,}\b/gi;
// Indian mobile numbers, with or without +91 / 0 and spaces or dashes.
const PHONE = /(?<![\d₹])(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;
// Card, Aadhaar and account numbers: 12-19 digits in a row, or in groups of 4.
const LONG_NUMBER = /(?<![\d₹])(?:\d{12,19}|\d{4}(?:[\s-]\d{4}){2,3})(?!\d)/g;

export const maskPersonalInfo = (text = "") =>
  String(text)
    .replace(EMAIL, "[email hidden]")
    .replace(UPI_ID, "[UPI ID hidden]")
    .replace(LONG_NUMBER, "[number hidden]")
    .replace(PHONE, "[phone hidden]");

export default maskPersonalInfo;
