export const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "interview", label: "Interview" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "deferred", label: "Deferred" },
];

export const DEFAULT_CHECKLIST_ITEMS = [
  "Transcripts sent",
  "Recommendation letters",
  "Statement of Purpose",
  "Test scores sent",
];

export const DEFAULT_APPLICATION_CHECKLIST_ITEMS = [
  "Personal Information",
  "Address",
  "Education",
  "Qualifications & Experience",
  "Desired Degrees",
];

export function statusLabel(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || value;
}

// Which icon (from src/shared/icons.js) represents each status on the Home
// dashboard's Overview stat cards. Coloring reuses the same data-status CSS
// already applied to .status-badge elsewhere, so this is icon-shape only.
export const STATUS_ICON_KEYS = {
  not_started: "clock",
  in_progress: "refreshCw",
  submitted: "send",
  interview: "users",
  accepted: "checkCircle",
  rejected: "xCircle",
  waitlisted: "hourglass",
  deferred: "hourglass",
};

function makeChecklist(labels) {
  return labels.map((label) => ({ id: crypto.randomUUID(), label, done: false }));
}

export function emptyApplication(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    school: "",
    program: "",
    portalUrl: "",
    status: "not_started",
    deadline: "",
    feePaid: false,
    notes: "",
    checklist: makeChecklist(DEFAULT_CHECKLIST_ITEMS),
    appChecklist: makeChecklist(DEFAULT_APPLICATION_CHECKLIST_ITEMS),
    lastFilledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Combined completion across the document checklist and the application checklist.
export function computeApplicationProgress(app) {
  const items = [...(app.checklist || []), ...(app.appChecklist || [])];
  if (items.length === 0) return 0;
  const done = items.filter((item) => item.done).length;
  return Math.round((done / items.length) * 100);
}

// Cleans a browser tab title into a plausible school name. Titles are split
// on common separators (e.g. "Application form | University of Strathclyde
// ISC") and, since either side could be the school name depending on the
// site, we prefer whichever segment actually looks like an institution name
// — falling back to the last segment (the more common "Page | Site" order),
// then to the hostname if nothing usable is found.
const INSTITUTION_HINT = /university|college|institute|academy|school of/i;

export function guessSchoolName(title, hostname) {
  if (title) {
    const segments = title
      .split(/\s[|:–—]\s|::/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (segments.length) {
      const best = segments.find((s) => INSTITUTION_HINT.test(s)) || segments[segments.length - 1];
      if (best && best.length <= 60) return best;
    }
  }
  return hostname || "";
}
