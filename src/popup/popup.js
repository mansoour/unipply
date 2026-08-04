import { scanFormFields } from "../content/scanner.js";
import { fillFields } from "../content/filler.js";
import { matchFieldsLocally, flattenProfile } from "../profile/matcher-fallback.js";
import { getProfile } from "../profile/storage.js";

let currentTabId = null;
let profile = null;
let candidates = [];
let rows = [];

const statusEl = document.getElementById("status");
const fileNoteEl = document.getElementById("file-note");
const resultsEl = document.getElementById("results-list");
const fillBtn = document.getElementById("fill-btn");

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

    if (row.confidence) {
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
  resultsEl.innerHTML = "";
  fillBtn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("No active tab.");
    return;
  }
  currentTabId = tab.id;

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

  renderRows();
  fillBtn.disabled = false;
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
}

document.getElementById("scan-btn").addEventListener("click", scan);
document.getElementById("fill-btn").addEventListener("click", fillApproved);
document.getElementById("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
