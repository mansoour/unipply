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
    checklist: DEFAULT_CHECKLIST_ITEMS.map((label) => ({ id: crypto.randomUUID(), label, done: false })),
    lastFilledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
