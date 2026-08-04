// Local heuristic matcher: used only when no Gemini API key is configured
// or a Gemini call fails. Pure data transform, no DOM access.
import { PROFILE_GROUPS } from "./schema.js";

const CONFIDENCE_THRESHOLD = 35;

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlapScore(a, b) {
  const tokensA = new Set(a.split(" ").filter(Boolean));
  const tokensB = new Set(b.split(" ").filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const t of tokensA) if (tokensB.has(t)) overlap++;
  return overlap / Math.max(tokensA.size, tokensB.size);
}

function scoreSignatureAgainst(signature, candidateText) {
  const sig = normalize(signature);
  const cand = normalize(candidateText);
  if (!sig || !cand) return 0;
  if (sig === cand) return 100;
  if (sig.includes(cand) || cand.includes(sig)) return 70;
  return Math.round(tokenOverlapScore(sig, cand) * 60);
}

// Flattens the profile into candidate entries the matcher can score against,
// skipping any field that has no value to offer. Also reused by the Gemini
// prompt builder (background/gemini.js) so both matchers see the same shape.
export function flattenProfile(profile) {
  const candidates = [];
  for (const group of PROFILE_GROUPS) {
    if (group.repeatable) {
      const entries = profile[group.key] || [];
      entries.forEach((entry, index) => {
        for (const field of group.fields) {
          const value = entry[field.key];
          if (value === undefined || value === null || value === "") continue;
          candidates.push({
            path: `${group.key}.${index}.${field.key}`,
            value,
            label: `${group.label} #${index + 1} — ${field.label}`,
            texts: [field.label, ...field.synonyms],
          });
        }
      });
    } else {
      const entry = profile[group.key] || {};
      for (const field of group.fields) {
        const value = entry[field.key];
        if (value === undefined || value === null || value === "") continue;
        candidates.push({
          path: `${group.key}.${field.key}`,
          value,
          label: `${group.label} — ${field.label}`,
          texts: [field.label, ...field.synonyms],
        });
      }
    }
  }
  return candidates;
}

// fields: array of {id, label, name, idAttr, placeholder, autocomplete, ariaLabel, nearbyText}
// returns: array of {fieldId, profileKey, value, confidence}
export function matchFieldsLocally(fields, profile) {
  const candidates = flattenProfile(profile);
  const results = [];

  for (const field of fields) {
    const signature = [
      field.label,
      field.ariaLabel,
      field.placeholder,
      field.name,
      field.idAttr,
      field.nearbyText,
    ]
      .filter(Boolean)
      .join(" ");

    let best = null;
    for (const candidate of candidates) {
      for (const text of candidate.texts) {
        const score = scoreSignatureAgainst(signature, text);
        if (!best || score > best.confidence) {
          best = { profileKey: candidate.path, value: candidate.value, confidence: score };
        }
      }
    }

    if (best && best.confidence >= CONFIDENCE_THRESHOLD) {
      results.push({ fieldId: field.id, ...best });
    }
  }

  return results;
}
