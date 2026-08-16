(function () {
  "use strict";

  const entries = Array.isArray(window.QADIAN_DIARY_ENTRIES) ? window.QADIAN_DIARY_ENTRIES : [];
  const list = document.getElementById("chapter-list");

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  if (!list) return;

  list.innerHTML = entries.map((entry, index) => {
    const number = String(index + 1).padStart(2, "0");
    const date = `${entry.date}${entry.part ? ` · ${entry.part}` : ""}`;
    return `
      <li class="chapter-row list-group-item p-0">
        <a href="sessions/${escapeHtml(entry.slug)}.html">
          <span class="chapter-number" aria-hidden="true">${number}</span>
          <span class="chapter-summary">
            <span class="chapter-name">${escapeHtml(entry.title)}</span>
            <span class="chapter-date">${escapeHtml(date)}</span>
          </span>
          <span class="chapter-arrow" aria-hidden="true">→</span>
          <span class="sr-only">Read Chapter ${index + 1}</span>
        </a>
      </li>`;
  }).join("");
}());
