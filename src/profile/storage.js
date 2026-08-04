import { emptyProfile } from "./schema.js";

const PROFILE_KEY = "profile";
const SETTINGS_KEY = "settings";

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

export async function exportProfile() {
  const profile = await getProfile();
  return JSON.stringify(profile, null, 2);
}

export async function importProfile(json) {
  const profile = JSON.parse(json);
  await saveProfile(profile);
  return profile;
}
