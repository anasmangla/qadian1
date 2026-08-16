(function () {
  "use strict";

  const STORAGE_KEY = "qadian-diary:last-chapter";
  const list = document.getElementById("chapter-list");
  const continueLink = document.getElementById("continue-reading");

  if (!list || !continueLink) return;

  function arrowIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ui-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const line = document.createElementNS(svg.namespaceURI, "path");
    line.setAttribute("d", "M5 12h14");
    const point = document.createElementNS(svg.namespaceURI, "path");
    point.setAttribute("d", "m12 5 7 7-7 7");
    svg.append(line, point);
    return svg;
  }

  const chapters = new Map(
    Array.from(list.querySelectorAll("a[data-chapter-slug]")).map((link) => [
      link.dataset.chapterSlug,
      {
        href: link.getAttribute("href"),
        number: Number(link.dataset.chapterNumber),
        title: link.dataset.chapterTitle
      }
    ])
  );

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    const chapter = saved && chapters.get(saved.slug);
    if (!chapter) return;

    continueLink.href = chapter.href;
    const label = document.createElement("span");
    label.textContent = `Continue reading · Chapter ${chapter.number}: ${chapter.title}`;
    continueLink.replaceChildren(label, arrowIcon());
    continueLink.removeAttribute("hidden");
  } catch {
    // The complete chapter list remains available when storage is blocked.
  }
}());
