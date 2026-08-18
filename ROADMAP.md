# Unipply Roadmap / Backlog

Ideas parked for later — nothing here is scheduled, this is just so nothing gets lost.

## Known issues

### Scanner finds 0 fields on some portals
Reported example: [Victoria University of Wellington admission app](https://puaha.wgtn.ac.nz/admissionapp/?ts=1785819346498)
— Scan reports "No fillable fields found on this page" even though the page is clearly an
application form.

Investigated the page's raw HTML: it's a **Microsoft Power Apps Portal** (Power Pages) — a heavy
client-rendered SPA. The raw HTML ships almost empty (nav + static text only) with a "You're
offline, read-only version" placeholder; real form fields are injected by JavaScript well after
initial load, and Power Apps portals frequently render the actual form canvas inside an `<iframe>`.

Our scanner (`src/content/scanner.js`) runs once, at the moment "Scan" is clicked, against the top
frame only. Two likely root causes, either or both:
1. **Timing** — fields don't exist in the DOM yet when the user clicks Scan on a slow-rendering SPA.
2. **Iframe** — `chrome.scripting.executeScript` only targets the top frame by default; if the form
   lives in an iframe, we'd never see it without `allFrames: true` (and same-origin/permission
   caveats for cross-origin iframes).

Fix ideas to try:
- Add `allFrames: true` to the scan injection and merge results across frames.
- If 0 fields found, retry once after a short delay (or watch for DOM changes via
  `MutationObserver` for a few seconds) before giving up, with a visible "still waiting for the
  page to load…" state instead of an immediate dead end.
- A manual "Rescan" button so the user can retry after the SPA finishes loading, without closing
  the popup.
- Longer-term: recognize known problem platforms (Power Apps/Power Pages, other heavy SPA
  frameworks) and apply a platform-specific wait/retry strategy automatically.

## Feature ideas

### From you
1. **Tracked-site indicator** — some visible signal (toolbar badge/icon overlay) the moment you
   land on a school's site showing whether you've already started/submitted there, without having
   to open the popup. Natural extension of the existing on-open detection + tracker match.
2. **Tutorial / onboarding page** — a first-run walkthrough. We already have unused
   `welcome-hero` assets designed for exactly this; could be a guided "set up profile → add API
   key → track your first school → scan a page" flow, possibly as a checklist on the Home panel.
3. **Local file storage** — worth splitting into two distinct ideas:
   - Actual document attachments (transcripts, SOP PDFs) — `chrome.storage.local` isn't built for
     large binaries; would need IndexedDB or the File System Access API.
   - Backups saved to a real folder on disk automatically, not just manual JSON export.

### Profile schema additions (seen on a real application form)
Spotted on a live admission form — funding/sponsorship questions that come up often enough to be
worth a real profile field instead of the free-text Notes box:
- "Applying with help from an agent?" — Yes/No.
- Government/sponsorship funding:
  - "Govt or Sponsorship organisation" (with an "other" free-text variant).
  - Specific named example seen: "Saudi Ministry of Culture – Cultural Scholarship Program
    (pending university admission approval)" — suggests a small preset list of common sponsors
    plus a custom option, not just freeform text.
- Domestic funding questions (funding source, each with its own Yes/No):
  - Self-funded
  - Fees Free Funded
  - StudyLink Funded
  - Employer Funded
  - Scholarship Type (open-ended, e.g. "—" placeholder in the source form)

Likely shape for later: a new "Funding & Sponsorship" profile group (or fields added to Desired
Degrees) — agent (bool), sponsorship type (select + other), and a funding-source list where each
entry can be toggled yes/no, plus scholarship type text. Needs more real-world examples before
locking the exact schema.

Also spotted: additional **Document Checklist** default items worth adding —
**Passport** and **Certificate** (alongside the existing Transcripts / Recommendation Letters /
Statement of Purpose / Test Scores).

More real-world fields spotted, likely belonging in Personal Information / a new Passport &
Residency group:
- Country of nationality
- Country of birth
- Country of permanent residence (with the "born there, hold a passport, or indefinite visa"
  qualifier some forms show as help text)
- Whether you've lived outside that country in the last 3 years
- Passport number, date of issue, date of expiry, place of issuance
- "To which other UK Universities/Colleges will you apply?" — a competing-applications
  disclosure question; could auto-suggest from your other tracked Applications entries instead of
  making you retype school names.

### Tracking & status
- Badge color coding by status (e.g. green = submitted/accepted, gray = not started) on the
  toolbar icon.
- Right-click context menu: "Track this page" / "Scan this page" without opening the popup first.
- Filter/sort the Applications tab (by status, by deadline, by school name).
- Decision comparison view once multiple schools reach "Accepted" — cost, funding offered,
  location side by side (from an earlier brainstorm, still relevant once real decisions start
  rolling in).
- Deadline reminders (badge count + `chrome.notifications`) and `.ics` calendar export — explicitly
  deferred once already when building the tracker; still worth revisiting.

### Reliability
- Per-domain field-mapping memory: once you correct a Gemini/heuristic mapping on a specific
  school's portal, remember the correction for next visit — cuts repeat API calls and improves
  accuracy over time without new architecture.
- Multi-step/paginated application forms — ability to re-scan per step without losing prior
  progress or context.
- Known-ATS-platform presets (Slate, Liaison CAS, Embark, ApplyWeb, Power Apps/Power Pages) for
  faster, more reliable matching on the platforms that show up again and again.
- **Two variants of the same underlying problem, both addressed now:**
  - *Two blocks on one page* (e.g. "Employer 1" / "Employer 2" fields together) — used to silently
    fill both with the same saved entry. Now the popup only auto-fills the first match and flags
    the second as "duplicate?", left unchecked so you pick a different saved entry or leave it
    blank.
  - *One block per page, page refreshes to add the next* (common on sites where you save one
    Employment/Education entry at a time) — the matcher had no way to know "this page is for
    saved entry #2." The popup now shows a "This page's Employment/Education/etc. entry:" picker
    whenever it detects fields from a repeatable group and you have 2+ saved entries — switching
    it re-points every matched field on the page to that entry at once.
  - Still open: doing this automatically (detecting repeated blocks or page-refresh sequences by
    DOM position/labels and auto-advancing through saved entries) instead of requiring the manual
    picker — bigger change, not done yet.

### AI features
- "Explain this question" — plain-language explainer for confusing application prompts (from the
  very first brainstorm session, never built).
- Gemini usage/cost tracker in Settings, so API spend isn't a surprise.
- Essay draft version history per application, not just a single overwritten draft.

### Data & sync
- `chrome.storage.sync` option to sync the (small) profile fields across the user's own Chrome
  installs via their Google account — documents/essays stay local-only given size limits.
- Automatic rolling backup history (keep last N exports), not only on-demand export.

### Polish
- Manual light/dark theme override (currently follows OS/browser automatically only).
- Keyboard shortcut (`chrome.commands`) to trigger Scan without opening the popup.

### Bigger / SaaS-shaped (own future track, not core extension work)
- Multi-profile support (e.g. an education consultant managing several students).
- Shareable read-only progress view for a parent/counselor — would need a backend, out of scope
  for the local-only extension as it stands today.
