# Unipply – AI-Powered University Application Assistant for Google Chrome

Unipply is a Chrome extension that saves your admission-application profile once — personal info,
education, experience, test scores, references, desired degrees — and helps you fill it into
university admission portals faster, using Gemini to match form fields and draft essay answers.

Nothing is ever submitted automatically. Unipply only fills fields; you always review the page and
click Submit yourself.

## Features
- **One profile, many portals** — manage your data in a control-panel-style options page (add,
  edit, delete).
- **AI-assisted field matching** — Gemini reads the page's form fields and your profile to suggest
  what goes where; you approve before anything is filled.
- **Local fallback matching** — if no Gemini API key is set (or a call fails), a deterministic local
  matcher still fills what it can.
- **Essay drafting help** — for open-ended application questions, draft a first pass from your
  stored background, editable before use.
- **Privacy-respecting by design** — your profile and API key stay in `chrome.storage.local`; the
  only network calls are to the Gemini API, using your own key.

## Getting started
1. Clone this repo.
2. Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this
   folder.
3. Open the extension's **Options** page and fill in your profile, then paste a Gemini API key
   under AI Settings.
4. On any admission form, click the Unipply icon → **Scan this page** → review the matches →
   **Fill approved fields**.

## Project layout
- `manifest.json` — Chrome Manifest V3 config.
- `src/background/` — service worker + Gemini API calls.
- `src/content/` — page scanning and field-filling, injected on demand.
- `src/options/` — the profile control panel.
- `src/popup/` — scan/review/fill UI.
- `src/profile/` — profile schema, storage, and local fallback matcher.
- `assets/` — extension icons (used by `manifest.json`).
- `marketing/` — brand and Chrome Web Store listing assets (not loaded by the extension).
