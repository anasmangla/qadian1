import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const cleanDir = path.join(projectDir, "data");
const sessionsDir = path.join(projectDir, "sessions");

const batchPaths = [1, 2, 3].map((number) => path.join(cleanDir, `batch${number}.json`));
const missing = batchPaths.filter((file) => !fs.existsSync(file));
if (missing.length) {
  throw new Error(`Missing cleaned diary data: ${missing.join(", ")}`);
}

const entries = batchPaths.flatMap((file) => JSON.parse(fs.readFileSync(file, "utf8")));
const photoManifestPath = path.join(projectDir, "photo-manifest.json");
const photoManifest = fs.existsSync(photoManifestPath)
  ? JSON.parse(fs.readFileSync(photoManifestPath, "utf8"))
  : [];

const sections = [
  "Departure & Delhi",
  "Departure & Delhi",
  "Departure & Delhi",
  "Delhi",
  "Delhi",
  "Delhi",
  "Agra",
  "Road to Qadian",
  "Road to Qadian",
  "Road to Qadian",
  "Road to Qadian",
  "Qadian",
  "Qadian",
  "Qadian",
  "Qadian",
  "Qadian",
  "Qadian",
  "Qadian",
  "Return Journey",
  "Return Journey",
  "Postscript",
  "Postscript"
];

const partLabels = [
  "", "", "", "Part I", "Part II", "", "", "Part I", "Part II", "Part III", "Part IV",
  "Part I", "Part II", "Part I", "Part II", "Part III", "Part I", "Part II", "", "", "", ""
];

const displayDates = [
  "Wednesday, November 20, 2024",
  "Thursday, November 21, 2024",
  "Friday, November 22, 2024",
  "Saturday, November 23, 2024",
  "Saturday, November 23, 2024",
  "Sunday, November 24, 2024",
  "Monday, November 25, 2024",
  "Tuesday, November 26, 2024",
  "Tuesday, November 26, 2024",
  "Tuesday, November 26, 2024",
  "Tuesday, November 26, 2024",
  "Wednesday, November 27, 2024",
  "Wednesday, November 27, 2024",
  "Thursday, November 28, 2024",
  "Thursday, November 28, 2024",
  "Thursday, November 28, 2024",
  "Friday, November 29, 2024",
  "Friday, November 29, 2024",
  "Saturday, November 30, 2024",
  "Sunday, December 1, 2024",
  "Wednesday, December 11, 2024",
  "Undated closing entry"
];

const shortDates = [
  "Nov 20", "Nov 21", "Nov 22", "Nov 23", "Nov 23", "Nov 24", "Nov 25",
  "Nov 26", "Nov 26", "Nov 26", "Nov 26", "Nov 27", "Nov 27", "Nov 28",
  "Nov 28", "Nov 28", "Nov 29", "Nov 29", "Nov 30", "Dec 1", "Dec 11", "Final"
];

function cleanWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function wordCount(entry) {
  return (entry.blocks || []).reduce((count, block) => {
    const text = block.type === "list" ? (block.items || []).join(" ") : block.text || "";
    return count + cleanWhitespace(text).split(" ").filter(Boolean).length;
  }, 0);
}

function excerptFor(entry) {
  const paragraph = (entry.blocks || []).find((block) => block.type === "paragraph" && cleanWhitespace(block.text).length > 80);
  const text = cleanWhitespace(paragraph?.text || entry.blocks?.[0]?.text || "");
  if (text.length <= 230) return text;
  const clipped = text.slice(0, 230).replace(/\s+\S*$/, "");
  return `${clipped}...`;
}

function uniqueNumbers(values) {
  return [...new Set((values || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
}

entries.forEach((entry, index) => {
  entry.section = sections[index] || "Diary";
  entry.part = partLabels[index] || "";
  entry.date = displayDates[index] || entry.date;
  entry.shortDate = shortDates[index] || entry.shortDate;
  if (entry.slug === "the-flying-out") entry.title = "The Flight Out";
  if (entry.slug === "a-sad-news-the-last-dervish-of-qadian") entry.title = "Sad News: The Last Dervish of Qadian";
  entry.sourcePages = uniqueNumbers(entry.sourcePages);
  entry.printedPages = entry.sourcePages.map((page) => page - 1).filter((page) => page > 0);
  entry.readingMinutes = Math.max(1, Math.ceil(wordCount(entry) / 220));
  entry.excerpt = excerptFor(entry);
  entry.sessionNumber = index + 1;
  entry.photos = photoManifest
    .filter((photo) => photo.sessionSlug === entry.slug)
    .map((photo) => ({
      src: photo.src,
      alt: photo.alt,
      caption: photo.caption,
      orientation: photo.orientation || "landscape",
      width: Number(photo.width) || undefined,
      height: Number(photo.height) || undefined
    }));
});

if (entries.length !== 22) {
  throw new Error(`Expected 22 diary sessions, received ${entries.length}.`);
}

const slugSet = new Set(entries.map((entry) => entry.slug));
if (slugSet.size !== entries.length) {
  throw new Error("Diary session slugs must be unique.");
}

for (const [index, photo] of photoManifest.entries()) {
  if (!slugSet.has(photo.sessionSlug)) {
    throw new Error(`Photo ${index + 1} references an unknown session: ${photo.sessionSlug}`);
  }
  if (![photo.src, photo.alt, photo.caption].every((value) => cleanWhitespace(value))) {
    throw new Error(`Photo ${index + 1} needs a source path, alt text, and caption.`);
  }
  const photoPath = path.resolve(projectDir, photo.src);
  if (!photoPath.startsWith(`${projectDir}${path.sep}`) || !fs.existsSync(photoPath)) {
    throw new Error(`Photo ${index + 1} is missing or outside the project: ${photo.src}`);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderBlock(block) {
  if (!block || !block.type) return "";
  if (block.type === "heading") return `<h2>${escapeHtml(block.text)}</h2>`;
  if (block.type === "quote") {
    const cite = block.cite ? `<cite>${escapeHtml(block.cite)}</cite>` : "";
    const quoteText = escapeHtml(block.text).replaceAll("\n", "<br>\n");
    return `<blockquote><p>${quoteText}</p>${cite}</blockquote>`;
  }
  if (block.type === "list" && Array.isArray(block.items)) {
    return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }
  return `<p>${escapeHtml(block.text)}</p>`;
}

function pageLabel(entry) {
  const pages = entry.printedPages;
  if (!pages.length) return "Original PDF session";
  return pages.length === 1 ? `Original diary page ${pages[0]}` : `Original diary pages ${pages[0]}-${pages[pages.length - 1]}`;
}

function navigationCard(entry, direction) {
  if (!entry) return '<span class="session-nav-placeholder"></span>';
  const label = direction === "previous" ? "Previous session" : "Next session";
  return `
    <a class="session-nav-card ${direction === "next" ? "next" : ""}" href="${escapeHtml(entry.slug)}.html">
      <span class="session-nav-label">${label}</span>
      <span class="session-nav-title">${escapeHtml(entry.title)}</span>
    </a>`;
}

function renderPhoto(photo, className = "", priority = false) {
  const orientation = photo.orientation ? ` ${escapeHtml(photo.orientation)}` : "";
  const loading = priority ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const dimensions = Number(photo.width) > 0 && Number(photo.height) > 0
    ? ` width="${Number(photo.width)}" height="${Number(photo.height)}"`
    : "";
  return `
    <figure class="${className}${orientation}">
      <button class="photo-open" type="button" data-photo-src="../${escapeHtml(photo.src)}" data-photo-alt="${escapeHtml(photo.alt)}" data-photo-caption="${escapeHtml(photo.caption)}" aria-label="View photo: ${escapeHtml(photo.alt)}">
        <img src="../${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}"${dimensions} ${loading} decoding="async">
        <span>View full photo</span>
      </button>
      <figcaption>${escapeHtml(photo.caption)}</figcaption>
    </figure>`;
}

function renderStory(entry) {
  const blocks = entry.blocks || [];
  const galleryPhotos = (entry.photos || []).slice(1);
  if (!galleryPhotos.length) return blocks.map(renderBlock).join("\n            ");

  const insertionPoint = Math.min(3, blocks.length);
  const first = blocks.slice(0, insertionPoint).map(renderBlock).join("\n            ");
  const gallery = `<div class="story-gallery" data-photo-count="${galleryPhotos.length}">${galleryPhotos.map((photo) => renderPhoto(photo, "story-photo")).join("")}</div>`;
  const rest = blocks.slice(insertionPoint).map(renderBlock).join("\n            ");
  return `${first}\n            ${gallery}\n            ${rest}`;
}

function sessionPage(entry, index) {
  const previous = entries[index - 1];
  const next = entries[index + 1];
  const sessionNumber = String(index + 1).padStart(2, "0");
  const canonical = `https://anasmangla.github.io/qadian1/sessions/${entry.slug}.html`;
  const pageDescription = entry.excerpt || `Session ${sessionNumber} of The Qadian Diary by Anas Mangla.`;
  const heroPhoto = entry.photos?.[0];
  const absolutePhotoUrl = heroPhoto ? `https://anasmangla.github.io/qadian1/${heroPhoto.src}` : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f79007">
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta property="og:title" content="${escapeHtml(entry.title)} | The Qadian Diary">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  ${absolutePhotoUrl ? `<meta property="og:image" content="${absolutePhotoUrl}">` : ""}
  <link rel="canonical" href="${canonical}">
  <title>${escapeHtml(entry.title)} | The Qadian Diary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
</head>
<body class="session-page">
  <a class="skip-link" href="#session-content">Skip to this diary session</a>
  <div class="reading-progress" aria-hidden="true"><span id="reading-progress-bar"></span></div>

  <header class="site-header" id="top">
    <div class="container nav-shell">
      <a class="site-brand" href="../index.html" aria-label="The Qadian Diary home">
        <span class="brand-kicker">Anas Mangla</span>
        <span class="brand-title">The Qadian Diary</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Open navigation menu">Menu</button>
      <nav class="primary-nav" id="primary-nav" aria-label="Primary navigation">
        <a href="../index.html#journey">Journey</a>
        <a href="../index.html#diary" aria-current="page">Diary</a>
        <a href="../index.html#reflections">Reflections</a>
      </nav>
    </div>
  </header>

  <main id="session-content">
    <section class="session-hero">
      <div class="container">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a href="../index.html">Home</a><span aria-hidden="true">/</span>
          <a href="../index.html#diary">Diary sessions</a><span aria-hidden="true">/</span>
          <span>Session ${sessionNumber}</span>
        </nav>
        <div class="session-hero-grid${heroPhoto ? " has-photo" : ""}">
          <div class="session-hero-content">
            <p class="eyebrow">${escapeHtml(entry.date)}</p>
            <h1>${escapeHtml(entry.title)}</h1>
            ${entry.part ? `<p class="session-part">${escapeHtml(entry.part)}</p>` : ""}
            <div class="session-meta" aria-label="Session details">
              <span>Session ${sessionNumber} of ${entries.length}</span>
              <span>${entry.readingMinutes} min read</span>
              <span>${escapeHtml(entry.section)}</span>
            </div>
          </div>
          ${heroPhoto ? renderPhoto(heroPhoto, "session-hero-photo", true) : ""}
        </div>
      </div>
    </section>

    <div class="session-main">
      <div class="container">
        <div class="session-layout">
          <article class="session-article">
            ${renderStory(entry)}
            <div class="source-note"><strong>Digital edition note:</strong> This session corresponds to ${escapeHtml(pageLabel(entry).toLowerCase())}. Obvious text-recognition artifacts were corrected, and limited identifying or logistical details were condensed for this public edition while preserving the author's devotional voice.</div>
          </article>
          <aside class="session-aside" aria-label="Session position">
            <p class="session-aside-title">In this journey</p>
            <p><strong>${escapeHtml(entry.section)}</strong><br>Session ${sessionNumber} of ${entries.length}</p>
            <p>${escapeHtml(pageLabel(entry))}</p>
            <p><a href="../index.html#diary">View all diary sessions</a></p>
          </aside>
        </div>
        <nav class="session-bottom-nav" aria-label="Previous and next diary sessions">
          ${navigationCard(previous, "previous")}
          ${navigationCard(next, "next")}
        </nav>
      </div>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container footer-layout">
      <div>
        <p class="footer-title">The Qadian Diary</p>
        <p>A personal journal by Anas Mangla.</p>
      </div>
      <a class="creator-mark" href="https://anasonix.com/" rel="noopener" aria-label="Designed in the Anasonix visual style">
        <img src="../assets/anasonix-logo.png" alt="Anasonix Digital Solutions">
      </a>
    </div>
  </footer>
  <dialog class="photo-lightbox" id="photo-lightbox" aria-label="Expanded trip photo">
    <div class="lightbox-shell">
      <button class="lightbox-close" type="button" aria-label="Close expanded photo">Close photo</button>
      <img id="lightbox-image" alt="">
      <p id="lightbox-caption"></p>
    </div>
  </dialog>
  <script src="../session.js"></script>
</body>
</html>
`;
}

fs.mkdirSync(sessionsDir, { recursive: true });
for (const file of fs.readdirSync(sessionsDir)) {
  if (file.endsWith(".html")) fs.unlinkSync(path.join(sessionsDir, file));
}

entries.forEach((entry, index) => {
  fs.writeFileSync(path.join(sessionsDir, `${entry.slug}.html`), sessionPage(entry, index));
});

fs.writeFileSync(
  path.join(projectDir, "diary-data.js"),
  `window.QADIAN_DIARY_ENTRIES = ${JSON.stringify(entries, null, 2)};\n`
);

const sitemapUrls = [
  "https://anasmangla.github.io/qadian1/",
  ...entries.map((entry) => `https://anasmangla.github.io/qadian1/sessions/${entry.slug}.html`)
];
fs.writeFileSync(
  path.join(projectDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`
);

console.log(`Built ${entries.length} diary session pages.`);
