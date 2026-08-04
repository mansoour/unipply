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

// Cleans a browser tab title into a plausible school name: takes the first
// segment before a common title separator, falls back to hostname if the
// title is missing or the cleaned segment looks unreasonable.
export function guessSchoolName(title, hostname) {
  if (title) {
    const segment = title.split(/\s[|:–—]\s|::/)[0].trim();
    if (segment && segment.length <= 60) return segment;
  }
  return hostname || "";
}
