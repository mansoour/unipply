import { PROFILE_GROUPS, emptyProfile, computeCompleteness } from "../profile/schema.js";
import {
  getProfile,
  saveProfile,
  getSettings,
  saveSettings,
  getApplications,
  saveApplications,
  exportProfile,
  importProfile,
} from "../profile/storage.js";
import { STATUS_OPTIONS, emptyApplication } from "../applications/schema.js";

let profile = emptyProfile();
let settings = { geminiApiKey: "", model: "gemini-3.5-flash" };
let applications = [];
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

const scheduleApplicationsSave = debounce(async () => {
  setStatus("Saving…", true);
  await saveApplications(applications);
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

function textField(labelText, value, onChange, { type = "text" } = {}) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const span = document.createElement("span");
  span.textContent = labelText;
  wrapper.appendChild(span);
  const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
  if (input.tagName === "INPUT") input.type = type;
  input.value = value || "";
  input.addEventListener("input", () => onChange(input.value));
  wrapper.appendChild(input);
  return wrapper;
}

function statusLabel(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || value;
}

function renderApplicationCard(app, index, onRemove) {
  const card = document.createElement("div");
  card.className = "entry";

  const header = document.createElement("div");
  header.className = "entry-header";

  const h3 = document.createElement("h3");
  h3.textContent = app.school || `Application #${index + 1}`;
  header.appendChild(h3);

  const badge = document.createElement("span");
  badge.className = "status-badge";
  badge.dataset.status = app.status;
  badge.textContent = statusLabel(app.status);
  header.appendChild(badge);

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove";
  removeBtn.type = "button";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => {
    if (!confirm(`Remove ${app.school || "this application"}? This can't be undone.`)) return;
    onRemove();
  });
  header.appendChild(removeBtn);
  card.appendChild(header);

  function touch() {
    app.updatedAt = new Date().toISOString();
    scheduleApplicationsSave();
  }

  card.appendChild(
    textField("School", app.school, (val) => {
      app.school = val;
      h3.textContent = val || `Application #${index + 1}`;
      touch();
    })
  );
  card.appendChild(
    textField("Program", app.program, (val) => {
      app.program = val;
      touch();
    })
  );
  card.appendChild(
    textField("Portal URL / Domain", app.portalUrl, (val) => {
      app.portalUrl = val;
      touch();
    })
  );

  const statusWrapper = document.createElement("label");
  statusWrapper.className = "field";
  const statusSpan = document.createElement("span");
  statusSpan.textContent = "Status";
  statusWrapper.appendChild(statusSpan);
  const statusSelect = document.createElement("select");
  for (const opt of STATUS_OPTIONS) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === app.status) o.selected = true;
    statusSelect.appendChild(o);
  }
  statusSelect.addEventListener("change", () => {
    app.status = statusSelect.value;
    badge.dataset.status = app.status;
    badge.textContent = statusLabel(app.status);
    touch();
  });
  statusWrapper.appendChild(statusSelect);
  card.appendChild(statusWrapper);

  card.appendChild(
    textField(
      "Deadline",
      app.deadline,
      (val) => {
        app.deadline = val;
        touch();
      },
      { type: "date" }
    )
  );

  const feeWrapper = document.createElement("label");
  feeWrapper.className = "field checkbox-field";
  const feeCheckbox = document.createElement("input");
  feeCheckbox.type = "checkbox";
  feeCheckbox.checked = !!app.feePaid;
  feeCheckbox.addEventListener("change", () => {
    app.feePaid = feeCheckbox.checked;
    touch();
  });
  const feeSpan = document.createElement("span");
  feeSpan.textContent = "Application fee paid";
  feeWrapper.appendChild(feeCheckbox);
  feeWrapper.appendChild(feeSpan);
  card.appendChild(feeWrapper);

  card.appendChild(
    textField(
      "Notes",
      app.notes,
      (val) => {
        app.notes = val;
        touch();
      },
      { type: "textarea" }
    )
  );

  const checklistTitle = document.createElement("div");
  checklistTitle.className = "checklist-title";
  checklistTitle.textContent = "Document checklist";
  card.appendChild(checklistTitle);

  const checklistEl = document.createElement("div");
  card.appendChild(checklistEl);

  function renderChecklist() {
    checklistEl.innerHTML = "";
    (app.checklist || []).forEach((item, itemIndex) => {
      const row = document.createElement("div");
      row.className = "checklist-item";

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = !!item.done;
      check.addEventListener("change", () => {
        item.done = check.checked;
        touch();
      });
      row.appendChild(check);

      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.value = item.label || "";
      labelInput.addEventListener("input", () => {
        item.label = labelInput.value;
        touch();
      });
      row.appendChild(labelInput);

      const removeItemBtn = document.createElement("button");
      removeItemBtn.type = "button";
      removeItemBtn.className = "remove-item";
      removeItemBtn.textContent = "×";
      removeItemBtn.addEventListener("click", () => {
        app.checklist.splice(itemIndex, 1);
        renderChecklist();
        touch();
      });
      row.appendChild(removeItemBtn);

      checklistEl.appendChild(row);
    });
  }
  renderChecklist();

  const addItemBtn = document.createElement("button");
  addItemBtn.type = "button";
  addItemBtn.className = "add-entry";
  addItemBtn.textContent = "+ Add checklist item";
  addItemBtn.addEventListener("click", () => {
    app.checklist = app.checklist || [];
    app.checklist.push({ id: crypto.randomUUID(), label: "", done: false });
    renderChecklist();
    touch();
  });
  card.appendChild(addItemBtn);

  if (app.lastFilledAt) {
    const lastFilled = document.createElement("p");
    lastFilled.className = "last-filled-note";
    lastFilled.textContent = `Last filled: ${new Date(app.lastFilledAt).toLocaleString()}`;
    card.appendChild(lastFilled);
  }

  return card;
}

function renderApplicationsPanel(container) {
  const title = document.createElement("h2");
  title.textContent = "Applications";
  container.appendChild(title);

  const listEl = document.createElement("div");
  container.appendChild(listEl);

  function renderList() {
    listEl.innerHTML = "";
    applications.forEach((app, index) => {
      listEl.appendChild(
        renderApplicationCard(app, index, () => {
          applications.splice(index, 1);
          renderList();
          scheduleApplicationsSave();
        })
      );
    });
  }
  renderList();

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-entry";
  addBtn.textContent = "+ Add Application";
  addBtn.addEventListener("click", () => {
    applications.push(emptyApplication());
    renderList();
    scheduleApplicationsSave();
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
  if (activeKey === "applications") {
    renderApplicationsPanel(panel);
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

  const applicationsBtn = document.createElement("button");
  applicationsBtn.type = "button";
  applicationsBtn.className = "nav-item divider" + (activeKey === "applications" ? " active" : "");
  applicationsBtn.textContent = "Applications";
  applicationsBtn.addEventListener("click", () => {
    activeKey = "applications";
    renderNav();
    renderPanel();
  });
  navList.appendChild(applicationsBtn);

  const settingsBtn = document.createElement("button");
  settingsBtn.type = "button";
  settingsBtn.className = "nav-item" + (activeKey === "settings" ? " active" : "");
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
  applications = await getApplications();

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
