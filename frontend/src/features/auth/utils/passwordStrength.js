const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const NUMBER = /[0-9]/;
const SPECIAL = /[^A-Za-z0-9]/;

export function getPasswordStrength(password) {
  if (!password) return null;

  let score = 0;

  if (password.length >= 8) score++;
  if (UPPER.test(password)) score++;
  if (LOWER.test(password)) score++;
  if (NUMBER.test(password)) score++;
  if (SPECIAL.test(password)) score++;

  if (score <= 2) {
    return {
      level: "weak",
      widthPct: 25,
      barClass: "bg-rose-400",
      emoji: "😠",
      message: "Weak",
    };
  }

  if (score === 3) {
    return {
      level: "fair",
      widthPct: 50,
      barClass: "bg-amber-400",
      emoji: "😐",
      message: "Fair",
    };
  }

  if (score === 4) {
    return {
      level: "good",
      widthPct: 75,
      barClass: "bg-sky-400",
      emoji: "😏",
      message: "Good",
    };
  }

  return {
    level: "strong",
    widthPct: 100,
    barClass: "bg-emerald-500",
    emoji: "😎",
    message: "Strong",
  };
}

export function isPasswordStrongEnough(password) {
  const s = getPasswordStrength(password);
  return Boolean(s && (s.level === "good" || s.level === "strong"));
}