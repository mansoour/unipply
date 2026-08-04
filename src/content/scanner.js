// Injected on demand via chrome.scripting.executeScript({ func: scanFormFields }).
// Must be fully self-contained: everything it needs is nested inside the
// function body, since MV3 serializes and re-executes it in the page's
// isolated world (no closures over outer module scope).
export function scanFormFields() {
  const SKIP_TYPES = ["hidden", "submit", "button", "image", "reset", "password"];
  const results = [];
  let counter = 0;

  function getLabelText(el) {
    if (el.id) {
      const escaped = window.CSS && CSS.escape ? CSS.escape(el.id) : el.id;
      const label = document.querySelector(`label[for="${escaped}"]`);
      if (label) return (label.innerText || label.textContent || "").trim();
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return (parentLabel.innerText || parentLabel.textContent || "").trim();
    return "";
  }

  function getAriaLabelText(el) {
    const direct = el.getAttribute("aria-label");
    if (direct) return direct;
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      return labelledBy
        .split(" ")
        .map((id) => {
          const target = document.getElementById(id);
          return target ? (target.innerText || target.textContent || "") : "";
        })
        .join(" ")
        .trim();
    }
    return "";
  }

  function getNearbyText(el) {
    const fieldset = el.closest("fieldset");
    if (fieldset) {
      const legend = fieldset.querySelector("legend");
      if (legend) return (legend.innerText || legend.textContent || "").trim().slice(0, 200);
    }
    const sib = el.previousElementSibling;
    if (sib && sib.innerText) return sib.innerText.trim().slice(0, 200);
    return "";
  }

  const elements = document.querySelectorAll("input, textarea, select");
  elements.forEach((el) => {
    if (el.disabled || el.readOnly) return;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;

    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (el.tagName === "INPUT" && SKIP_TYPES.includes(type)) return;

    const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
    if (autocomplete.startsWith("cc-")) return; // never touch payment card fields

    counter++;
    const fieldId = "unifill-" + counter;
    el.setAttribute("data-unifill-id", fieldId);

    results.push({
      id: fieldId,
      tag: el.tagName.toLowerCase(),
      type,
      label: getLabelText(el),
      ariaLabel: getAriaLabelText(el),
      placeholder: el.getAttribute("placeholder") || "",
      name: el.getAttribute("name") || "",
      idAttr: el.id || "",
      nearbyText: getNearbyText(el),
      maxLength: el.maxLength && el.maxLength > 0 ? el.maxLength : null,
      options: el.tagName === "SELECT" ? Array.from(el.options).map((o) => o.text.trim()) : undefined,
      isFileUpload: type === "file",
      isEssayLike: el.tagName === "TEXTAREA" && (!el.maxLength || el.maxLength > 200 || el.maxLength === -1),
    });
  });

  return results;
}
