import { PROFILE_GROUPS, emptyProfile, computeCompleteness } from "../profile/schema.js";
import { getProfile, saveProfile, getSettings, saveSettings, exportProfile, importProfile } from "../profile/storage.js";

let profile = emptyProfile();
let settings = { geminiApiKey: "", model: "gemini-3.5-flash" };
let activeKey = PROFILE_GROUPS[0].key;

const navList = document.getElementById("nav-list");
const panel = document.getElementById("panel");
const statusPill = document.getElementById("status-pill");
const progressFill = document.getElementById("progress-fill");
const progressLabel = document.getElementById("progress-label");

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function setStatus(text, saving = false) {
  statusPill.textContent = text;
  statusPill.classList.toggle("saving", saving);
}

const scheduleProfileSave = debounce(async () => {
  setStatus("Saving…", true);
  await saveProfile(profile);
  setStatus("All changes saved");
}, 600);

const scheduleSettingsSave = debounce(async () => {
  setStatus("Saving…", true);
  await saveSettings(settings);
  setStatus("All changes saved");
}, 600);

function updateProgress() {
  const pct = computeCompleteness(profile);
  progressFill.style.width = `${pct}%`;
  progressLabel.textContent = `${pct}% complete`;
}

function fieldInput(field, value, onChange) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";

  const span = document.createElement("span");
  span.textContent = field.label;
  wrapper.appendChild(span);

  const input = field.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
  if (input.tagName === "INPUT") {
    input.type = field.type === "date" ? "date" : "text";
  }
  input.value = value ?? "";
  input.addEventListener("input", () => onChange(input.value));
  wrapper.appendChild(input);

  return wrapper;
}

function renderEntryFields(group, entry, onFieldChange) {
  const frag = document.createDocumentFragment();
  for (const field of group.fields) {
    frag.appendChild(fieldInput(field, entry[field.key], (val) => onFieldChange(field.key, val)));
  }
  return frag;
}

function onProfileFieldChange() {
  updateProgress();
  scheduleProfileSave();
}

function renderNonRepeatableGroup(group, container) {
  const title = document.createElement("h2");
  title.textContent = group.label;
  container.appendChild(title);

  if (!profile[group.key]) profile[group.key] = {};
  const entry = profile[group.key];
  container.appendChild(
    renderEntryFields(group, entry, (key, val) => {
      entry[key] = val;
      onProfileFieldChange();
    })
  );
}

function renderRepeatableGroup(group, container) {
  if (!Array.isArray(profile[group.key])) profile[group.key] = [];
  const entries = profile[group.key];

  const title = document.createElement("h2");
  title.textContent = group.label;
  container.appendChild(title);

  const listEl = document.createElement("div");
  container.appendChild(listEl);

  function renderEntries() {
    listEl.innerHTML = "";
    entries.forEach((entry, index) => {
      const entryEl = document.createElement("div");
      entryEl.className = "entry";

      const header = document.createElement("div");
      header.className = "entry-header";
      const h3 = document.createElement("h3");
      h3.textContent = `${group.label} #${index + 1}`;
      header.appendChild(h3);

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove";
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        entries.splice(index, 1);
        renderEntries();
        onProfileFieldChange();
      });
      header.appendChild(removeBtn);
      entryEl.appendChild(header);

      entryEl.appendChild(
        renderEntryFields(group, entry, (key, val) => {
          entry[key] = val;
          onProfileFieldChange();
        })
      );
      listEl.appendChild(entryEl);
    });
  }
  renderEntries();

  const addBtn = document.createElement("button");
  addBtn.className = "add-entry";
  addBtn.type = "button";
  addBtn.textContent = `+ Add ${group.label}`;
  addBtn.addEventListener("click", () => {
    entries.push({});
    renderEntries();
    onProfileFieldChange();
  });
  container.appendChild(addBtn);
}

function renderSettingsPanel(container) {
  const title = document.createElement("h2");
  title.textContent = "Settings";
  container.appendChild(title);

  const disclosure = document.createElement("p");
  disclosure.className = "disclosure";
  disclosure.textContent =
    "Your profile and API key stay on this device (chrome.storage.local). The only network calls Unipply makes are to the Gemini API, using the key below, when you scan a page or draft an essay.";
  container.appendChild(disclosure);

  const apiKeyField = document.createElement("label");
  apiKeyField.className = "field";
  apiKeyField.innerHTML = "<span>Gemini API Key</span>";
  const apiKeyInput = document.createElement("input");
  apiKeyInput.type = "password";
  apiKeyInput.autocomplete = "off";
  apiKeyInput.placeholder = "Paste your Gemini API key";
  apiKeyInput.value = settings.geminiApiKey || "";
  apiKeyInput.addEventListener("input", () => {
    settings.geminiApiKey = apiKeyInput.value.trim();
    scheduleSettingsSave();
  });
  apiKeyField.appendChild(apiKeyInput);
  container.appendChild(apiKeyField);

  const modelField = document.createElement("label");
  modelField.className = "field";
  modelField.innerHTML = "<span>Model</span>";
  const modelInput = document.createElement("input");
  modelInput.type = "text";
  modelInput.placeholder = "gemini-3.5-flash";
  modelInput.value = settings.model || "gemini-3.5-flash";
  modelInput.addEventListener("input", () => {
    settings.model = modelInput.value.trim() || "gemini-3.5-flash";
    scheduleSettingsSave();
  });
  modelField.appendChild(modelInput);
  container.appendChild(modelField);

  const actions = document.createElement("div");
  actions.className = "settings-actions";

  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.textContent = "Export Backup (JSON)";
  exportBtn.addEventListener("click", async () => {
    const json = await exportProfile();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unipply-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  });
  actions.appendChild(exportBtn);

  const importBtn = document.createElement("button");
  importBtn.type = "button";
  importBtn.textContent = "Import Backup (JSON)";
  importBtn.addEventListener("click", () => document.getElementById("import-profile").click());
  actions.appendChild(importBtn);

  container.appendChild(actions);
}

function renderPanel() {
  panel.innerHTML = "";
  if (activeKey === "settings") {
    renderSettingsPanel(panel);
    return;
  }
  const group = PROFILE_GROUPS.find((g) => g.key === activeKey);
  if (!group) return;
  if (group.repeatable) {
    renderRepeatableGroup(group, panel);
  } else {
    renderNonRepeatableGroup(group, panel);
  }
}

function renderNav() {
  navList.innerHTML = "";
  for (const group of PROFILE_GROUPS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-item" + (activeKey === group.key ? " active" : "");
    btn.textContent = group.label;
    btn.addEventListener("click", () => {
      activeKey = group.key;
      renderNav();
      renderPanel();
    });
    navList.appendChild(btn);
  }

  const settingsBtn = document.createElement("button");
  settingsBtn.type = "button";
  settingsBtn.className = "nav-item settings" + (activeKey === "settings" ? " active" : "");
  settingsBtn.textContent = "Settings";
  settingsBtn.addEventListener("click", () => {
    activeKey = "settings";
    renderNav();
    renderPanel();
  });
  navList.appendChild(settingsBtn);
}

async function init() {
  profile = await getProfile();
  settings = await getSettings();

  renderNav();
  renderPanel();
  updateProgress();

  document.getElementById("import-profile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    profile = await importProfile(text);
    updateProgress();
    if (activeKey !== "settings") renderPanel();
    setStatus("Imported.");
    e.target.value = "";
  });
}

init();
