// Injected on demand via chrome.scripting.executeScript({ func: fillFields, args: [mapping] }).
// Self-contained for the same reason as scanner.js. Only fills fields the
// popup's review UI approved; never touches file inputs; never submits anything.
export function fillFields(mapping) {
  function toISODate(value) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function highlight(el) {
    el.style.outline = "2px solid #22c55e";
    el.style.outlineOffset = "2px";
    el.style.backgroundColor = "rgba(34,197,94,0.08)";
  }

  let filledCount = 0;

  mapping.forEach(({ fieldId, value }) => {
    if (value === undefined || value === null || value === "") return;
    const el = document.querySelector(`[data-unifill-id="${fieldId}"]`);
    if (!el) return;

    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (el.tagName === "INPUT" && type === "file") return; // browsers block scripted file values anyway
    if (el.value) return; // never overwrite an already-filled field

    if (el.tagName === "SELECT") {
      const options = Array.from(el.options);
      const wanted = String(value).trim().toLowerCase();
      const match =
        options.find((o) => o.text.trim().toLowerCase() === wanted) ||
        options.find((o) => o.text.trim().toLowerCase().includes(wanted));
      if (!match) return;
      el.value = match.value;
    } else if (el.tagName === "INPUT" && type === "date") {
      const iso = toISODate(value);
      if (!iso) return;
      el.value = iso;
    } else {
      el.value = value;
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    highlight(el);
    filledCount++;
  });

  return filledCount;
}
