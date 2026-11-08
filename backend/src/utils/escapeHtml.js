// Escape untrusted text before interpolating it into HTML (emails).
// The global xss() request filter still allows whitelisted tags such as
// <a href>, so user-controlled names must be escaped at render time.
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default escapeHtml;
