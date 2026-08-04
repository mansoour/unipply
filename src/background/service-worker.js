import { getSettings, getProfile } from "../profile/storage.js";
import { mapFieldsWithGemini, draftEssayWithGemini } from "./gemini.js";

// Central point for every Gemini call, so the API key never has to be
// passed into (or read by) a page-injected content script.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === "mapFields") {
    (async () => {
      try {
        const [settings, profile] = await Promise.all([getSettings(), getProfile()]);
        const mapping = await mapFieldsWithGemini(message.fields, profile, settings);
        sendResponse({ ok: true, mapping });
      } catch (err) {
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
    })();
    return true;
  }

  if (message?.action === "draftEssay") {
    (async () => {
      try {
        const [settings, profile] = await Promise.all([getSettings(), getProfile()]);
        const draft = await draftEssayWithGemini(message.questionText, profile, settings);
        sendResponse({ ok: true, draft });
      } catch (err) {
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
    })();
    return true;
  }

  return false;
});
