import { flattenProfile } from "../profile/matcher-fallback.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGeminiRaw(model, apiKey, promptText, { jsonMode } = {}) {
  const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = { contents: [{ parts: [{ text: promptText }] }] };
  if (jsonMode) body.generationConfig = { responseMimeType: "application/json" };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini API returned no content");
  return text;
}

// fields: scanner.js output (minus file inputs). profile: full profile object.
// Returns: [{fieldId, profileKey, value, confidence}]
export async function mapFieldsWithGemini(fields, profile, settings) {
  if (!settings.geminiApiKey) throw new Error("No Gemini API key configured");

  const candidates = flattenProfile(profile);
  const compactFields = fields
    .filter((f) => !f.isFileUpload)
    .map((f) => ({
      id: f.id,
      tag: f.tag,
      type: f.type,
      label: f.label,
      ariaLabel: f.ariaLabel,
      placeholder: f.placeholder,
      name: f.name,
      idAttr: f.idAttr,
      nearbyText: f.nearbyText,
      options: f.options,
      isEssayLike: f.isEssayLike,
    }));
  const compactProfile = candidates.map((c) => ({ profileKey: c.path, value: c.value }));

  const prompt = `You are matching HTML form fields on a university admission application page to a student's saved profile data.

Form fields (JSON array):
${JSON.stringify(compactFields, null, 2)}

Student profile values, keyed by profileKey (JSON array):
${JSON.stringify(compactProfile, null, 2)}

For each form field that clearly corresponds to one of the profile values, output an entry. Skip fields with no confident match. Skip essay/open-ended fields (isEssayLike=true) unless a profile value is directly and fully appropriate as-is. Never invent a value that isn't present in the profile list above.

Respond with ONLY a JSON array, no prose, in this exact shape:
[{"fieldId": "<field id>", "profileKey": "<profileKey from the list above>", "value": "<value to fill>", "confidence": <0-100 integer>}]`;

  const text = await callGeminiRaw(settings.model || "gemini-3.5-flash", settings.geminiApiKey, prompt, {
    jsonMode: true,
  });
  const result = JSON.parse(text);
  if (!Array.isArray(result)) throw new Error("Unexpected Gemini response shape");
  return result;
}

// questionText: the on-page question/prompt for an essay-like field.
// profile: full profile object, used as the factual source for drafting.
export async function draftEssayWithGemini(questionText, profile, settings) {
  if (!settings.geminiApiKey) throw new Error("No Gemini API key configured");

  const candidates = flattenProfile(profile);
  const relevantGroups = ["education", "experience", "desiredDegrees", "documents"];
  const background = candidates
    .filter((c) => relevantGroups.some((g) => c.path.startsWith(g)))
    .map((c) => `${c.path}: ${c.value}`)
    .join("\n");

  const prompt = `You are helping a student draft an answer to a university admission application question, using only their real background below. Be specific, avoid generic filler, and stay honest to the facts given. Do not fabricate experience not present in the background.

Application question:
${questionText}

Student background (key: value pairs):
${background || "(no background on file)"}

Respond with ONLY the drafted answer text, no preamble, no markdown formatting.`;

  const text = await callGeminiRaw(settings.model || "gemini-3.5-flash", settings.geminiApiKey, prompt);
  return text.trim();
}
