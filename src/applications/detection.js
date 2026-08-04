// Cheap, no-cost heuristic to guess "does this page look like an admission
// application?" — used only to decide whether to show the tracker prompt on
// popup open. Never blocks anything and never calls an API by itself.

const KNOWN_ATS_DOMAINS = [
  "slateapp.com",
  "technolutions.com",
  "liaisoncas.com",
  "embark.com",
  "applyweb.com",
  "coalitionforcollegeaccess.org",
  "commonapp.org",
  "applytexas.org",
  "slideroom.com",
];

const KEYWORDS = ["admission", "admissions", "apply", "application"];

export function isLikelyAdmissionPage(title, url) {
  const haystack = `${title || ""} ${url || ""}`.toLowerCase();
  if (KNOWN_ATS_DOMAINS.some((domain) => haystack.includes(domain))) return true;
  return KEYWORDS.some((keyword) => haystack.includes(keyword));
}
