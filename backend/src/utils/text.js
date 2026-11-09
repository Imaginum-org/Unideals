/**
 * Normalise user-written multi-line text (listing descriptions):
 *  • CRLF / CR → LF
 *  • exotic spaces (NBSP, en/em, ideographic…) → normal space
 *  • zero-width space / word joiner / BOM removed (ZWJ kept for emoji)
 *  • per line: tabs + runs of spaces collapse to one space, ends trimmed
 *  • 3+ line breaks collapse to one blank line (paragraphs survive)
 *  • whole text trimmed
 * Non-strings pass through untouched. Keep in sync with
 * frontend/src/utils/text.js.
 */
// Built from code points so no invisible characters live in the source.
const charClass = (codes) => new RegExp(`[${String.fromCharCode(...codes)}]`, "g");
const EXOTIC_SPACES = charClass([
  0x00a0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
  0x2007, 0x2008, 0x2009, 0x200a, 0x202f, 0x205f, 0x3000,
]);
const INVISIBLES = charClass([0x200b, 0x2060, 0xfeff]);

export const normalizeMultiline = (value) => {
  if (typeof value !== "string") return value;
  return value
    .replace(/\r\n?/g, "\n")
    .replace(EXOTIC_SPACES, " ")
    .replace(INVISIBLES, "")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export default normalizeMultiline;
