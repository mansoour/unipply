// Small hand-authored inline icon set — replaces emoji and bare text labels
// across the extension. Static, developer-authored SVG only (safe to insert
// via innerHTML), no external icon library or network fetch.

function svg(inner) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

export const ICONS = {
  home: svg(
    '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4h4v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9"/>'
  ),
  user: svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/>'),
  pin: svg('<path d="M12 2a5 5 0 0 0-5 5c0 3.2 5 11 5 11s5-7.8 5-11a5 5 0 0 0-5-5Z"/><circle cx="12" cy="7" r="2"/>'),
  graduationCap: svg(
    '<path d="M2 9 12 4l10 5-10 5-10-5Z"/><path d="M6 11.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-5.5"/><path d="M22 9v6"/>'
  ),
  briefcase: svg(
    '<rect x="3" y="8" width="18" height="11" rx="1.5"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>'
  ),
  target: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/>'),
  clipboardList: svg(
    '<rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/>'
  ),
  users: svg(
    '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5"/><circle cx="17.5" cy="9" r="2.4"/><path d="M15.8 14.8c2.3.4 4.2 2.2 4.2 5.2"/>'
  ),
  fileText: svg(
    '<path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5V8h4"/><path d="M8.5 12.5h7M8.5 15.5h7M8.5 18.5h4"/>'
  ),
  folder: svg('<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18Z"/>'),
  settings: svg(
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.9 7.9 0 0 0 0-2l2-1.6-2-3.4-2.4.8a8 8 0 0 0-1.7-1L15 3h-6l-.3 2.8a8 8 0 0 0-1.7 1l-2.4-.8-2 3.4L4.6 11a7.9 7.9 0 0 0 0 2l-2 1.6 2 3.4 2.4-.8a8 8 0 0 0 1.7 1L9 21h6l.3-2.8a8 8 0 0 0 1.7-1l2.4.8 2-3.4Z"/>'
  ),
  edit: svg(
    '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 7.5l3 3"/>'
  ),
  chevronDown: svg('<path d="M6 9l6 6 6-6"/>'),
  externalLink: svg('<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
  refreshCw: svg(
    '<path d="M4 12a8 8 0 0 1 14.5-4.5"/><path d="M20 12a8 8 0 0 1-14.5 4.5"/><path d="M18.5 3v4.5H14"/><path d="M5.5 21v-4.5H10"/>'
  ),
  send: svg('<path d="M21 3 10.5 13.5"/><path d="M21 3 14.5 21l-4-7.5L3 9.5 21 3Z"/>'),
  checkCircle: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/>'),
  xCircle: svg('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'),
  hourglass: svg(
    '<path d="M6 3h12"/><path d="M6 21h12"/><path d="M7 3c0 5 5 6 5 9s-5 4-5 9"/><path d="M17 3c0 5-5 6-5 9s5 4 5 9"/>'
  ),
  scan: svg(
    '<path d="M4 8V5a1 1 0 0 1 1-1h3"/><path d="M16 4h3a1 1 0 0 1 1 1v3"/><path d="M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M8 20H5a1 1 0 0 1-1-1v-3"/>'
  ),
  shieldCheck: svg('<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/><path d="M9 12l2 2 4-4"/>'),
};
