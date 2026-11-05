const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const NUMBER = /[0-9]/;
const SPECIAL = /[^A-Za-z0-9]/;

// Single source of truth for the checklist (matches the scorer below).
export function getPasswordChecks(password = "") {
  const pw = String(password || "");
  return [
    { id: "length", label: "At least 8 characters", met: pw.length >= 8 },
    { id: "upper", label: "One uppercase letter (A–Z)", met: UPPER.test(pw) },
    { id: "lower", label: "One lowercase letter (a–z)", met: LOWER.test(pw) },
    { id: "number", label: "One number (0–9)", met: NUMBER.test(pw) },
    { id: "special", label: "One symbol (!, @, #, …)", met: SPECIAL.test(pw) },
  ];
}

export function getPasswordStrength(password) {
  if (!password) return null;

  const met = getPasswordChecks(password).filter((c) => c.met).length;

  if (met <= 2) {
    return { level: "weak", widthPct: 25, barClass: "bg-rose-400", message: "Weak" };
  }
  if (met === 3) {
    return { level: "fair", widthPct: 50, barClass: "bg-amber-400", message: "Fair" };
  }
  if (met === 4) {
    return { level: "good", widthPct: 75, barClass: "bg-sky-400", message: "Good" };
  }
  return { level: "strong", widthPct: 100, barClass: "bg-emerald-500", message: "Strong" };
}

export function isPasswordStrongEnough(password) {
  const s = getPasswordStrength(password);
  return Boolean(s && (s.level === "good" || s.level === "strong"));
}

const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];
const shuffle = (str) =>
  str
    .split("")
    .map((c) => ({ c, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((o) => o.c)
    .join("");

// Strong, memorable-ish suggestion seeded from the FULL name (email name
// as fallback): name fragment + digits + symbols, shuffled. Always clears
// all five checks (no ambiguous 0/O/1/l characters).
export function suggestPassword(fullName = "", email = "") {
  const raw =
    String(fullName || "").replace(/[^a-zA-Z]/g, "") ||
    String(email || "")
      .split("@")[0]
      .replace(/[^a-zA-Z]/g, "") ||
    "Unideals";
  const stem = raw.slice(0, 6);
  const cap = stem.charAt(0).toUpperCase() + stem.slice(1).toLowerCase();
  const digits = Array.from({ length: 3 }, () => pick("23456789")).join("");
  const specials = Array.from({ length: 2 }, () => pick("!@#$%&*?")).join("");
  const lowers = Array.from({ length: 3 }, () =>
    pick("abcdefghjkmnpqrstuvwxyz"),
  ).join("");
  return shuffle(`${cap}${digits}${specials}${lowers}`).slice(0, 20);
}
