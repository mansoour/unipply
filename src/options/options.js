import { PROFILE_GROUPS, emptyProfile } from "../profile/schema.js";
import { getProfile, saveProfile, getSettings, saveSettings, exportProfile, importProfile } from "../profile/storage.js";

let profile = emptyProfile();

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

function renderNonRepeatableGroup(group, container) {
  container.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = group.label;
  container.appendChild(title);

  if (!profile[group.key]) profile[group.key] = {};
  const entry = profile[group.key];
  container.appendChild(renderEntryFields(group, entry, (key, val) => (entry[key] = val)));
}

function renderRepeatableGroup(group, container) {
  container.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = group.label;
  container.appendChild(title);

  if (!Array.isArray(profile[group.key])) profile[group.key] = [];
  const entries = profile[group.key];

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
      renderRepeatableGroup(group, container);
    });
    header.appendChild(removeBtn);
    entryEl.appendChild(header);

    entryEl.appendChild(renderEntryFields(group, entry, (key, val) => (entry[key] = val)));
    container.appendChild(entryEl);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "add-entry";
  addBtn.type = "button";
  addBtn.textContent = `+ Add ${group.label}`;
  addBtn.addEventListener("click", () => {
    entries.push({});
    renderRepeatableGroup(group, container);
  });
  container.appendChild(addBtn);
}

function renderAllGroups() {
  const root = document.getElementById("groups-container");
  root.innerHTML = "";
  for (const group of PROFILE_GROUPS) {
    const section = document.createElement("section");
    section.className = "card";
    root.appendChild(section);
    if (group.repeatable) {
      renderRepeatableGroup(group, section);
    } else {
      renderNonRepeatableGroup(group, section);
    }
  }
}

function flashStatus(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  setTimeout(() => {
    if (el.textContent === message) el.textContent = "";
  }, 2500);
}

async function init() {
  profile = await getProfile();
  renderAllGroups();

  const settings = await getSettings();
  document.getElementById("gemini-api-key").value = settings.geminiApiKey || "";
  document.getElementById("gemini-model").value = settings.model || "gemini-3.5-flash";

  document.getElementById("save-profile").addEventListener("click", async () => {
    await saveProfile(profile);
    flashStatus("profile-status", "Saved.");
  });

  document.getElementById("save-settings").addEventListener("click", async () => {
    await saveSettings({
      geminiApiKey: document.getElementById("gemini-api-key").value.trim(),
      model: document.getElementById("gemini-model").value.trim() || "gemini-3.5-flash",
    });
    flashStatus("settings-status", "Saved.");
  });

  document.getElementById("export-profile").addEventListener("click", async () => {
    const json = await exportProfile();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uni-application-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("import-profile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    profile = await importProfile(text);
    renderAllGroups();
    flashStatus("profile-status", "Imported.");
    e.target.value = "";
  });
}

init();
