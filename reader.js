(function () {
  "use strict";

  const STORAGE_KEY = "qadian-diary:last-chapter";
  const { chapterSlug, chapterNumber, chapterTitle } = document.body.dataset;

  if (!chapterSlug || !chapterNumber || !chapterTitle) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      slug: chapterSlug,
      number: Number(chapterNumber),
      title: chapterTitle
    }));
  } catch {
    // Reading never depends on storage being available.
  }
}());
