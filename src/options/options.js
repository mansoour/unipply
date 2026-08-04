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
import { STATUS_OPTIONS, emptyApplication, statusLabel, computeApplicationProgress } from "../applications/schema.js";
import { ICONS } from "../shared/icons.js";

const GROUP_ICONS = {
  personal: "user",
  address: "pin",
  education: "graduationCap",
  experience: "briefcase",
  desiredDegrees: "target",
  testScores: "clipboardList",
  references: "users",
  documents: "fileText",
};

let profile = emptyProfile();
let settings = { geminiApiKey: "", model: "gemini-3.5-flash" };
let applications = [];
let activeKey = "home";

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

// Reusable progress bar (same visual language as the sidebar's), used on the Home panel.
function renderProgressBar(pct, labelText, { compact = false } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "progress-wrap" + (compact ? " compact" : "");

  const track = document.createElement("div");
  track.className = "progress-track";
  const fill = document.createElement("div");
  fill.className = "progress-fill";
  fill.style.width = `${pct}%`;
  track.appendChild(fill);
  wrap.appendChild(track);

  const label = document.createElement("span");
  label.className = "progress-label";
  label.textContent = labelText;
  wrap.appendChild(label);

  return wrap;
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

function renderChecklistSection(card, app, key, title, touch) {
  const checklistTitle = document.createElement("div");
  checklistTitle.className = "checklist-title";
  checklistTitle.textContent = title;
  card.appendChild(checklistTitle);

  const checklistEl = document.createElement("div");
  card.appendChild(checklistEl);

  function renderChecklist() {
    checklistEl.innerHTML = "";
    (app[key] || []).forEach((item, itemIndex) => {
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
        app[key].splice(itemIndex, 1);
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
  addItemBtn.textContent = `+ Add ${title.toLowerCase()} item`;
  addItemBtn.addEventListener("click", () => {
    app[key] = app[key] || [];
    app[key].push({ id: crypto.randomUUID(), label: "", done: false });
    renderChecklist();
    touch();
  });
  card.appendChild(addItemBtn);
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
  const programWrapper = document.createElement("label");
  programWrapper.className = "field";
  const programSpan = document.createElement("span");
  programSpan.textContent = "Program";
  programWrapper.appendChild(programSpan);
  const programInput = document.createElement("input");
  programInput.type = "text";
  programInput.value = app.program || "";
  const desiredPrograms = [...new Set((profile.desiredDegrees || []).map((d) => d.program).filter(Boolean))];
  if (desiredPrograms.length) {
    const datalistId = `programs-${app.id}`;
    const datalist = document.createElement("datalist");
    datalist.id = datalistId;
    for (const p of desiredPrograms) {
      const opt = document.createElement("option");
      opt.value = p;
      datalist.appendChild(opt);
    }
    programWrapper.appendChild(datalist);
    programInput.setAttribute("list", datalistId);
  }
  programInput.addEventListener("input", () => {
    app.program = programInput.value;
    touch();
  });
  programWrapper.appendChild(programInput);
  card.appendChild(programWrapper);
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

  renderChecklistSection(card, app, "checklist", "Document Checklist", touch);
  renderChecklistSection(card, app, "appChecklist", "Application Checklist", touch);

  const addedNote = document.createElement("p");
  addedNote.className = "last-filled-note";
  addedNote.textContent = `Added: ${new Date(app.createdAt).toLocaleString()}`;
  card.appendChild(addedNote);

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

function renderHomePanel(container) {
  const hero = document.createElement("div");
  hero.className = "home-hero";
  const heroImg = document.createElement("img");
  heroImg.src = "../../assets/branding/welcome-hero.png";
  heroImg.alt = "Welcome to Unipply";
  hero.appendChild(heroImg);
  container.appendChild(hero);

  const meta = document.createElement("p");
  meta.className = "home-meta";
  const now = new Date();
  const dateText = now.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const firstName = profile.personal?.firstName;
  meta.textContent = firstName ? `Welcome back, ${firstName} — ${dateText}` : dateText;
  container.appendChild(meta);

  container.appendChild((() => {
    const h2 = document.createElement("h2");
    h2.textContent = "Overview";
    h2.className = "home-section-title";
    h2.style.marginTop = "0";
    return h2;
  })());

  const statGrid = document.createElement("div");
  statGrid.className = "stat-grid";

  const totalCard = document.createElement("div");
  totalCard.className = "stat-card";
  totalCard.innerHTML = `<div class="stat-value">${applications.length}</div><div class="stat-label">Total Applications</div>`;
  statGrid.appendChild(totalCard);

  for (const opt of STATUS_OPTIONS) {
    const count = applications.filter((a) => a.status === opt.value).length;
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `<div class="stat-value">${count}</div><div class="stat-label">${opt.label}</div>`;
    statGrid.appendChild(card);
  }
  container.appendChild(statGrid);

  const profileTitle = document.createElement("h2");
  profileTitle.className = "home-section-title";
  profileTitle.textContent = "Your Profile";
  container.appendChild(profileTitle);

  const profileCard = document.createElement("div");
  profileCard.className = "profile-progress-card";
  const pct = computeCompleteness(profile);
  profileCard.appendChild(renderProgressBar(pct, `${pct}% complete`));
  container.appendChild(profileCard);

  const recentTitle = document.createElement("h2");
  recentTitle.className = "home-section-title";
  recentTitle.textContent = "Recent Applications";
  container.appendChild(recentTitle);

  if (applications.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No applications tracked yet — visit a school's application page or add one from the Applications tab.";
    container.appendChild(empty);
    return;
  }

  const recent = [...applications]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 10);

  for (const app of recent) {
    const row = document.createElement("div");
    row.className = "recent-app-row";

    const name = document.createElement("span");
    name.className = "recent-app-name";
    name.textContent = app.school || "Untitled application";
    row.appendChild(name);

    const badge = document.createElement("span");
    badge.className = "status-badge";
    badge.dataset.status = app.status;
    badge.textContent = statusLabel(app.status);
    row.appendChild(badge);

    const progressWrap = document.createElement("div");
    progressWrap.className = "recent-app-progress";
    const appPct = computeApplicationProgress(app);
    progressWrap.appendChild(renderProgressBar(appPct, `${appPct}%`, { compact: true }));
    row.appendChild(progressWrap);

    container.appendChild(row);
  }
}

function renderPanel() {
  panel.innerHTML = "";
  if (activeKey === "home") {
    renderHomePanel(panel);
    return;
  }
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

function sectionLabel(text) {
  const el = document.createElement("div");
  el.className = "nav-section-label";
  el.textContent = text;
  return el;
}

function navButton(key, label, iconKey) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-item" + (activeKey === key ? " active" : "");

  const icon = document.createElement("span");
  icon.className = "nav-icon";
  icon.innerHTML = ICONS[iconKey] || "";
  btn.appendChild(icon);

  const text = document.createElement("span");
  text.textContent = label;
  btn.appendChild(text);

  btn.addEventListener("click", () => {
    activeKey = key;
    renderNav();
    renderPanel();
  });
  return btn;
}

function renderNav() {
  navList.innerHTML = "";

  navList.appendChild(navButton("home", "Home", "home"));

  navList.appendChild(sectionLabel("Profile"));
  for (const group of PROFILE_GROUPS) {
    navList.appendChild(navButton(group.key, group.label, GROUP_ICONS[group.key]));
  }

  navList.appendChild(sectionLabel("Tracking"));
  navList.appendChild(navButton("applications", "Applications", "folder"));

  navList.appendChild(sectionLabel("Settings"));
  navList.appendChild(navButton("settings", "Settings", "settings"));
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
