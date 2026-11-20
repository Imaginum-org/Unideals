// "Open Gmail"-style shortcut on the check-your-inbox screens.
// Only for big public webmail domains; college/workspace domains can't be
// mapped reliably, so they get no button.
const PROVIDERS = [
  { test: /^(gmail|googlemail)\.com$/, name: "Gmail", url: "https://mail.google.com/mail/u/0/#inbox" },
  {
    test: /^(outlook|hotmail|live|msn)\.(com|in|co\.uk)$/,
    name: "Outlook",
    url: "https://outlook.live.com/mail/0/",
  },
  { test: /^(yahoo|ymail|rocketmail)\.(com|in|co\.in)$/, name: "Yahoo Mail", url: "https://mail.yahoo.com/" },
  { test: /^(icloud|me|mac)\.com$/, name: "iCloud Mail", url: "https://www.icloud.com/mail" },
  { test: /^(proton\.me|protonmail\.com|pm\.me)$/, name: "Proton Mail", url: "https://mail.proton.me/" },
];

/** @returns {{ name: string, url: string } | null} */
export function getMailProvider(email) {
  const domain = String(email || "").trim().toLowerCase().split("@")[1];
  if (!domain) return null;
  const hit = PROVIDERS.find((p) => p.test.test(domain));
  return hit ? { name: hit.name, url: hit.url } : null;
}

/** 125 → "2:05" */
export function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
