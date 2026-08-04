import { emptyProfile } from "./schema.js";

const PROFILE_KEY = "profile";
const SETTINGS_KEY = "settings";
const APPLICATIONS_KEY = "applications";

export async function getProfile() {
  const data = await chrome.storage.local.get(PROFILE_KEY);
  return data[PROFILE_KEY] || emptyProfile();
}

export async function saveProfile(profile) {
  await chrome.storage.local.set({ [PROFILE_KEY]: profile });
}

export async function getSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return data[SETTINGS_KEY] || { geminiApiKey: "", model: "gemini-3.5-flash" };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getApplications() {
  const data = await chrome.storage.local.get(APPLICATIONS_KEY);
  return data[APPLICATIONS_KEY] || [];
}

export async function saveApplications(applications) {
  await chrome.storage.local.set({ [APPLICATIONS_KEY]: applications });
}

// Backup bundle: profile + tracked applications. Deliberately excludes
// settings (the Gemini API key) — a backup file is meant to be portable/
// shareable without leaking that.
export async function exportBackup() {
  const [profile, applications] = await Promise.all([getProfile(), getApplications()]);
  return JSON.stringify({ exportedAt: new Date().toISOString(), profile, applications }, null, 2);
}

export async function importBackup(json) {
  const data = JSON.parse(json);
  // Backward-compatible with the old export format, which was just the raw profile object.
  const profile = data.profile || data;
  const applications = Array.isArray(data.applications) ? data.applications : await getApplications();
  await saveProfile(profile);
  await saveApplications(applications);
  return { profile, applications };
}
