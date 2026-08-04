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
