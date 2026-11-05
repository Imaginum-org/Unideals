// Chat safety screen: flags sexually explicit / abusive messages.
// Three layers (all must read the same normalized text):
//   1. boundary match on punctuation-stripped text (zero false positives
//      like "class" or "grapes"),
//   2. repeat-collapse ("fuuuck" -> "fuck") + leetspeak,
//   3. spaced-letter runs ("f u c k") and compacted-substring matching
//      restricted to a vetted SAFE set (never "ass"/"tit"/"cock"-style
//      colliders like "title", "peacock", "brandy").
// Conservative where it matters: anything flagged goes to a human moderator
// via the auto-report path instead of harsher action.

const TERMS = [
  // English profanity / sexual content (boundary tier)
  "fuck", "fucking", "fucker", "fucked", "motherfucker", "shit", "shitty",
  "bullshit", "bitch", "bitches", "bastard", "bastards", "bastardi",
  "asshole", "assholes", "dickhead", "dick", "dicks", "dickwad", "dick pic",
  "cock", "cunt", "cunts", "pussy", "pussies", "boobs", "boobies", "boob",
  "tits", "titties", "titty", "tit", "porn", "porno", "xxx", "hentai",
  "onlyfans", "sexy", "horny", "hookup", "orgasm", "orgy", "bdsm", "fetish",
  "masturbate", "masturbation", "masturbating", "blowjob", "handjob", "sodomy", "cunnilingus", "fellatio",
  "anal", "vagina", "penis", "dildo", "vibrator", "cum", "cumming",
  "suck my", "send nudes", "slut", "sluts", "whore", "whores", "thot",
  "prostitute", "escort service", "pimp", "pimping", "nude", "nudes",
  "naked", "strip", "condom", "ass", "threesome", "douche", "douchebag",
  "scumbag", "wanker", "twat", "bollocks", "arse", "arsehole", "prick",
  "cooch", "coochie", "molest", "molester", "rape", "raped", "rapist",
  "incest",
  // Slurs
  "nigger", "nigga", "chinki", "faggot", "hijra", "hijda",
  // Common Hinglish (transliterated) abuse
  "chutiya", "chutiye", "bhosdike", "bhosdi", "madarchod", "maderchod",
  "behenchod", "behnchod", "bhenchod", "bakchod", "bakchodi", "gaand",
  "gandu", "lund", "loda", "laude", "lodu", "lavde", "lavda", "chut",
  "chod", "chudai", "randi", "raand", "suar", "kamina", "kaminey",
  "kamini", "harami", "haraami",   "kutiya", "kuttiya", "kutta",
  "jhatu", "jhaant", "tatte", "muth", "saale", "chhinal",
  "bsdk", "bkl",
];

// Compacted-substring tier: SAFE allowlist only. Every term here was checked
// against common English collisions (class, title, grapes, brandy, peacock,
// Moby Dick, pussyfoot, propaganda, stripe, analyze, document, cucumber).
const TIER2_SAFE = new Set(
  [
    "fuck", "fucking", "fucker", "fucked", "shit", "shitty", "bullshit",
    "bitch", "bitches", "bastard", "bastards", "bastardi", "asshole",
    "assholes", "dickhead", "dickwad", "dickpic", "porn", "porno", "xxx",
    "hentai", "onlyfans", "sexy", "horny", "hookup", "orgasm", "orgy",
    "bdsm", "fetish", "masturbate", "masturbation", "masturbating", "blowjob", "handjob", "sodomy",
    "cunnilingus", "fellatio", "slut", "sluts", "whore", "whores", "thot",
    "prostitute", "naked", "condom", "cumming", "cunt",
    "cunts", "nigger", "nigga", "faggot", "hijra", "hijda", "chutiya",
    "chutiye", "bhosdike", "bhosdi", "madarchod", "maderchod", "behenchod",
    "behnchod", "bhenchod", "bakchod", "bakchodi", "gaand", "gandu",
    "lund", "loda", "laude", "lodu", "lavde", "lavda", "chod", "chudai",
    "kamina", "kaminey", "kamini", "harami", "haraami", "kutiya",
    "kuttiya", "kutta", "jhatu", "jhaant", "tatte", "muth", "saale",
    "chhinal", "raand", "rapist", "incest", "molest", "molester",
    "bsdk", "bkl", "boobies", "titties", "titty", "pussies", "tits",
    "threesome", "douchebag", "scumbag", "wanker", "twat", "bollocks",
    "arsehole", "cooch", "coochie", "dildo", "vibrator", "sendnudes",
    "pimping",
  ].map((t) => t.replace(/\s+/g, "")),
);

const LEET = { 4: "a", 3: "e", 0: "o", 1: "i", 5: "s", 7: "t", "@": "a", "$": "s" };

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalize = (text) =>
  String(text || "")
    .toLowerCase()
    .split("")
    .map((ch) => LEET[ch] || ch)
    .join("");

const collapseRepeats = (s) => s.replace(/(.)\1{2,}/g, "$1");

const boundaryRx = (term) =>
  new RegExp(`\\b${term.split(/\s+/).map(escapeRx).join("\\s+")}\\b`, "i");

/**
 * Screen a chat message. Returns { flagged, matched }, matched is the
 * first offending term (for the moderator note), never shown to users.
 */
export const screenText = (text) => {
  const base = normalize(text);
  if (!base.trim()) return { flagged: false, matched: null };

  // Layer 1+2: punctuation stripped, repeats collapsed, boundary match.
  const s1 = collapseRepeats(base.replace(/[^a-z0-9\s]/g, ""));
  for (const term of TERMS) {
    if (boundaryRx(term).test(s1)) return { flagged: true, matched: term };
  }

  // Layer 3a: spaced-out letters ("f u c k", "p o r n").
  const runs = s1.match(/\b(?:[a-z]\s+){2,}[a-z]\b/g) || [];
  for (const run of runs) {
    const compact = run.replace(/\s+/g, "");
    for (const term of TERMS) {
      const flat = term.replace(/\s+/g, "");
      if (flat.length >= 3 && boundaryRx(flat).test(compact)) {
        return { flagged: true, matched: term };
      }
    }
  }

  // Layer 3b: compacted substring over the vetted SAFE set only.
  const s2 = s1.replace(/[^a-z0-9]/g, "");
  for (const safe of TIER2_SAFE) {
    if (safe.length >= 4 && s2.includes(safe)) {
      return { flagged: true, matched: safe };
    }
  }

  return { flagged: false, matched: null };
};

export const BLOCKED_PLACEHOLDER = "This message was blocked";
