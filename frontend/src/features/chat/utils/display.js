// Display helpers shared by chat + orders so names and avatars render
// identically everywhere.

/** "KAMAL SINHA" -> "Kamal Sinha", "  anuragvit " -> "Anuragvit". */
export const formatName = (name) => {
  const s = String(name || "").trim().replace(/\s+/g, " ");
  if (!s) return "User";
  return s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

/** Avatar may be a URL string or a { url, fileId } object, returns URL|null. */
export const avatarUrl = (avatar) => {
  if (!avatar) return null;
  if (typeof avatar === "string") return avatar || null;
  return avatar.url || null;
};
