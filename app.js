(function () {
  "use strict";

  const STORAGE_KEY = "qadian-diary:last-chapter";
  const list = document.getElementById("chapter-list");
  const continueLink = document.getElementById("continue-reading");

  if (!list || !continueLink) return;

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
    continueLink.textContent = `Continue reading · Chapter ${chapter.number}: ${chapter.title} →`;
    continueLink.removeAttribute("hidden");
  } catch {
    // The complete chapter list remains available when storage is blocked.
  }
}());
