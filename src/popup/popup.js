import { scanFormFields } from "../content/scanner.js";
import { fillFields } from "../content/filler.js";
import { matchFieldsLocally, flattenProfile } from "../profile/matcher-fallback.js";
import { getProfile, getApplications, saveApplications } from "../profile/storage.js";
import { PROFILE_GROUPS } from "../profile/schema.js";
import { emptyApplication, statusLabel, guessSchoolName } from "../applications/schema.js";
import { isLikelyAdmissionPage } from "../applications/detection.js";
import { ICONS } from "../shared/icons.js";

// Repeatable profile groups (Education, Experience, etc.) — a profileKey like
// "experience.0.organization" pointing into one of these is only safe to
// auto-fill into ONE page field. If a second, different field also resolves
// to that exact same key (e.g. a form with "Employer 1" / "Employer 2"
// blocks but only one saved entry to match against), filling both would
// silently duplicate one job's info into what's meant to be a second entry.
const REPEATABLE_GROUP_KEYS = new Set(PROFILE_GROUPS.filter((g) => g.repeatable).map((g) => g.key));

function isRepeatableEntryKey(profileKey) {
  if (!profileKey) return false;
  const [groupKey, indexPart] = profileKey.split(".");
  return REPEATABLE_GROUP_KEYS.has(groupKey) && /^\d+$/.test(indexPart);
}

let currentTabId = null;
let currentTabUrl = null;
let currentTabTitle = null;
let profile = null;
let candidates = [];
let rows = [];

const statusEl = document.getElementById("status");
const fileNoteEl = document.getElementById("file-note");
const entryPickersEl = document.getElementById("entry-pickers");
const resultsEl = document.getElementById("results-list");
const fillBtn = document.getElementById("fill-btn");
const trackerPromptEl = document.getElementById("tracker-prompt");

function setStatus(text) {
  statusEl.textContent = text;
}

function fieldDisplayName(field) {
  return field.label || field.ariaLabel || field.placeholder || field.name || field.idAttr || "(unlabeled field)";
}

function buildQuestionText(field) {
  const parts = [field.label, field.ariaLabel, field.nearbyText, field.placeholder].filter(Boolean);
  return parts.join(" — ") || "Please write a response for this application question.";
}

function summarizeEntry(group, entry, index) {
  const parts = group.fields
    .map((f) => entry[f.key])
    .filter(Boolean)
    .slice(0, 2);
  return parts.length ? parts.join(" — ") : `${group.label} #${index + 1}`;
}

// Some admission sites only show one Employment/Education/etc. block per page
// load — you fill it, the page refreshes, and you fill the next one on a
// fresh page. Since that's a single set of fields each time, the matcher has
// no way to know "this page is for saved entry #2" on its own. This renders
// one dropdown per repeatable group found among the matched fields, letting
// the user say which saved entry this page's fields should come from —
// changing it re-points every field in that group at once instead of having
// to override each field's dropdown individually.
function renderEntryPickers() {
  entryPickersEl.innerHTML = "";
  if (!profile) return;

  const groupsPresent = new Set();
  for (const row of rows) {
    if (isRepeatableEntryKey(row.profileKey)) groupsPresent.add(row.profileKey.split(".")[0]);
  }

  for (const groupKey of groupsPresent) {
    const group = PROFILE_GROUPS.find((g) => g.key === groupKey);
    const entries = profile[groupKey] || [];
    if (!group || entries.length < 2) continue; // nothing to choose between

    const rowsForGroup = rows.filter((r) => r.profileKey.startsWith(`${groupKey}.`));
    const currentIndex = Number(rowsForGroup[0].profileKey.split(".")[1]);

    const wrap = document.createElement("div");
    wrap.className = "entry-picker";

    const label = document.createElement("label");
    label.textContent = `This page's ${group.label} entry:`;
    wrap.appendChild(label);

    const select = document.createElement("select");
    entries.forEach((entry, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = summarizeEntry(group, entry, idx);
      if (idx === currentIndex) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      const newIndex = Number(select.value);
      for (const row of rows) {
        if (!row.profileKey.startsWith(`${groupKey}.`)) continue;
        const fieldKey = row.profileKey.split(".").slice(2).join(".");
        const newPath = `${groupKey}.${newIndex}.${fieldKey}`;
        const match = candidates.find((c) => c.path === newPath);
        row.profileKey = newPath;
        row.value = match ? match.value : "";
        row.include = Boolean(match && match.value);
        row.duplicateWarning = false;
      }
      renderRows();
    });
    wrap.appendChild(select);

    entryPickersEl.appendChild(wrap);
  }
}

function renderRows() {
  resultsEl.innerHTML = "";

  if (rows.length === 0) {
    return;
  }

  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "row";

    const header = document.createElement("div");
    header.className = "row-header";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = row.include;
    checkbox.addEventListener("change", () => (row.include = checkbox.checked));
    header.appendChild(checkbox);

    const label = document.createElement("label");
    label.textContent = fieldDisplayName(row.field);
    header.appendChild(label);

    if (row.duplicateWarning) {
      const warning = document.createElement("span");
      warning.className = "confidence low";
      warning.title = "Another field on this page already matched the same saved entry — pick a different one below, or leave blank.";
      warning.textContent = "duplicate?";
      header.appendChild(warning);
    } else if (row.confidence) {
      const badge = document.createElement("span");
      badge.className = "confidence" + (row.confidence < 60 ? " low" : "");
      badge.textContent = `${row.confidence}%`;
      header.appendChild(badge);
    }

    rowEl.appendChild(header);

    const select = document.createElement("select");
    const noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = "— manual / no profile match —";
    select.appendChild(noneOpt);
    for (const c of candidates) {
      const opt = document.createElement("option");
      opt.value = c.path;
      opt.textContent = c.label;
      if (c.path === row.profileKey) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener("change", () => {
      row.profileKey = select.value;
      const match = candidates.find((c) => c.path === select.value);
      if (match) {
        row.value = match.value;
        row.include = true;
        checkbox.checked = true;
        valueInput.value = match.value;
      }
    });
    rowEl.appendChild(select);

    const isTextarea = row.field.tag === "textarea";
    const valueInput = document.createElement(isTextarea ? "textarea" : "input");
    if (!isTextarea) valueInput.type = "text";
    valueInput.value = row.value || "";
    valueInput.addEventListener("input", () => (row.value = valueInput.value));
    rowEl.appendChild(valueInput);

    if (row.field.isEssayLike) {
      const draftBtn = document.createElement("button");
      draftBtn.type = "button";
      draftBtn.className = "draft-btn";
      draftBtn.textContent = "Draft with AI";
      draftBtn.addEventListener("click", async () => {
        draftBtn.disabled = true;
        draftBtn.textContent = "Drafting…";
        const resp = await chrome.runtime.sendMessage({
          action: "draftEssay",
          questionText: buildQuestionText(row.field),
        });
        draftBtn.disabled = false;
        draftBtn.textContent = "Draft with AI";
        if (resp?.ok) {
          row.value = resp.draft;
          row.include = true;
          row.profileKey = "";
          valueInput.value = resp.draft;
          checkbox.checked = true;
          select.value = "";
        } else {
          setStatus(`Draft failed: ${resp?.error || "unknown error"}`);
        }
      });
      rowEl.appendChild(draftBtn);
    }

    resultsEl.appendChild(rowEl);
  }
}

async function scan() {
  setStatus("Scanning…");
  fileNoteEl.textContent = "";
  trackerPromptEl.innerHTML = "";
  entryPickersEl.innerHTML = "";
  resultsEl.innerHTML = "";
  fillBtn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("No active tab.");
    return;
  }
  currentTabId = tab.id;
  currentTabUrl = tab.url;
  currentTabTitle = tab.title;

  let injection;
  try {
    injection = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scanFormFields });
  } catch (err) {
    setStatus(`Could not scan this page: ${err.message}`);
    return;
  }

  const scannedFields = injection[0]?.result || [];
  const fileFields = scannedFields.filter((f) => f.isFileUpload);
  const fillableFields = scannedFields.filter((f) => !f.isFileUpload);

  if (fileFields.length) {
    fileNoteEl.textContent = `${fileFields.length} file upload field(s) detected — these need manual upload.`;
  }

  if (fillableFields.length === 0) {
    setStatus("No fillable fields found on this page.");
    return;
  }

  profile = await getProfile();
  candidates = flattenProfile(profile);

  let mapping = [];
  const resp = await chrome.runtime.sendMessage({ action: "mapFields", fields: fillableFields });
  if (resp?.ok) {
    mapping = resp.mapping;
    setStatus(`Scanned ${fillableFields.length} field(s) — Gemini matched ${mapping.length}.`);
  } else {
    mapping = matchFieldsLocally(fillableFields, profile);
    setStatus(`Gemini unavailable (${resp?.error || "no key set"}) — used local matching, matched ${mapping.length}.`);
  }

  rows = fillableFields.map((field) => {
    const m = mapping.find((x) => x.fieldId === field.id);
    return {
      fieldId: field.id,
      field,
      profileKey: m?.profileKey || "",
      value: m?.value ?? "",
      confidence: m?.confidence ?? 0,
      include: Boolean(m),
    };
  });

  const seenRepeatableKeys = new Set();
  for (const row of rows) {
    if (!isRepeatableEntryKey(row.profileKey)) continue;
    if (seenRepeatableKeys.has(row.profileKey)) {
      row.include = false;
      row.duplicateWarning = true;
    } else {
      seenRepeatableKeys.add(row.profileKey);
    }
  }

  renderEntryPickers();
  renderRows();
  fillBtn.disabled = false;
}

function getHostname(value) {
  if (!value) return null;
  try {
    const withScheme = value.includes("://") ? value : `https://${value}`;
    return new URL(withScheme).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function openApplicationInManage(appId) {
  const url = chrome.runtime.getURL(`src/options/options.html#applications/${appId}`);
  chrome.tabs.create({ url });
}

function trackerRow(text, { appId } = {}) {
  const row = document.createElement("div");
  row.className = "tracker-row";
  const icon = document.createElement("span");
  icon.className = "tracker-icon";
  icon.innerHTML = ICONS.pin;
  row.appendChild(icon);
  const span = document.createElement("span");
  span.textContent = text;
  row.appendChild(span);

  if (appId) {
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "icon-btn";
    openBtn.title = "View / edit this application";
    openBtn.innerHTML = ICONS.edit;
    openBtn.addEventListener("click", () => openApplicationInManage(appId));
    row.appendChild(openBtn);
  }

  return row;
}

function setTrackerMessage(text, appId) {
  trackerPromptEl.innerHTML = "";
  trackerPromptEl.appendChild(trackerRow(text, { appId }));
}

function renderTrackerPrompt(hostname, apps, { afterFill }) {
  trackerPromptEl.innerHTML = "";
  trackerPromptEl.appendChild(
    trackerRow(afterFill ? `Track ${hostname}?` : `This looks like an application page — track ${hostname}?`)
  );

  const actions = document.createElement("div");
  actions.className = "tracker-actions";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "secondary";
  addBtn.textContent = "Add to Tracker";
  addBtn.addEventListener("click", async () => {
    const app = emptyApplication({
      school: guessSchoolName(currentTabTitle, hostname),
      portalUrl: hostname,
      status: afterFill ? "in_progress" : "not_started",
      lastFilledAt: afterFill ? new Date().toISOString() : null,
    });
    apps.push(app);
    await saveApplications(apps);
    setTrackerMessage(`Added ${app.school} to your tracker.`, app.id);
  });
  actions.appendChild(addBtn);

  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = "ghost";
  dismissBtn.textContent = "Dismiss";
  dismissBtn.addEventListener("click", () => {
    trackerPromptEl.innerHTML = "";
  });
  actions.appendChild(dismissBtn);

  trackerPromptEl.appendChild(actions);
}

// afterFill=true: called right after a successful Fill (updates/creates with "in progress").
// afterFill=false: called on popup open when the page merely looks like an application (informational,
// or an offer to add it — never silently creates or edits anything without a click).
async function linkToApplicationTracker({ afterFill }) {
  const hostname = getHostname(currentTabUrl);
  if (!hostname) return;

  const apps = await getApplications();
  const existing = apps.find((a) => getHostname(a.portalUrl) === hostname);

  if (existing) {
    if (afterFill) {
      existing.lastFilledAt = new Date().toISOString();
      if (existing.status === "not_started") existing.status = "in_progress";
      existing.updatedAt = existing.lastFilledAt;
      await saveApplications(apps);
      setTrackerMessage(`Updated tracker: ${existing.school || hostname}.`, existing.id);
    } else {
      setTrackerMessage(`Tracking: ${existing.school || hostname} (${statusLabel(existing.status)})`, existing.id);
    }
    return;
  }

  renderTrackerPrompt(hostname, apps, { afterFill });
}

async function fillApproved() {
  const mapping = rows.filter((r) => r.include && r.value).map((r) => ({ fieldId: r.fieldId, value: r.value }));
  if (!mapping.length) {
    setStatus("Nothing selected to fill.");
    return;
  }
  if (!currentTabId) {
    setStatus("Scan the page first.");
    return;
  }
  const injection = await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: fillFields,
    args: [mapping],
  });
  const filledCount = injection[0]?.result ?? 0;
  setStatus(`Filled ${filledCount} field(s). Review the page before submitting.`);

  if (filledCount > 0) {
    await linkToApplicationTracker({ afterFill: true });
  }
}

document.getElementById("scan-btn").addEventListener("click", scan);
document.getElementById("fill-btn").addEventListener("click", fillApproved);
document.getElementById("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("popup-year").textContent = String(new Date().getFullYear());

(async function detectOnOpen() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  currentTabId = tab.id;
  currentTabUrl = tab.url;
  currentTabTitle = tab.title;

  if (isLikelyAdmissionPage(tab.title, tab.url)) {
    await linkToApplicationTracker({ afterFill: false });
  }
})();
