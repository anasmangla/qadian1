import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const dataDir = path.join(projectDir, "data");
const sessionsDir = path.join(projectDir, "sessions");
const indexPath = path.join(projectDir, "index.html");

const batchPaths = [1, 2, 3].map((number) => path.join(dataDir, `batch${number}.json`));
const missing = batchPaths.filter((file) => !fs.existsSync(file));
if (missing.length) throw new Error(`Missing cleaned diary data: ${missing.join(", ")}`);

const entries = batchPaths.flatMap((file) => JSON.parse(fs.readFileSync(file, "utf8")));
const photoManifestPath = path.join(projectDir, "photo-manifest.json");
const photoManifest = fs.existsSync(photoManifestPath)
  ? JSON.parse(fs.readFileSync(photoManifestPath, "utf8"))
  : [];

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

const displayDateIsos = [
  "2024-11-20", "2024-11-21", "2024-11-22", "2024-11-23", "2024-11-23", "2024-11-24",
  "2024-11-25", "2024-11-26", "2024-11-26", "2024-11-26", "2024-11-26", "2024-11-27",
  "2024-11-27", "2024-11-28", "2024-11-28", "2024-11-28", "2024-11-29", "2024-11-29",
  "2024-11-30", "2024-12-01", "2024-12-11", ""
];

const partLabels = [
  "", "", "", "Part I", "Part II", "", "", "Part I", "Part II", "Part III", "Part IV",
  "Part I", "Part II", "Part I", "Part II", "Part III", "Part I", "Part II", "", "", "", ""
];

function cleanWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function excerptFor(entry) {
  const paragraph = (entry.blocks || []).find(
    (block) => block.type === "paragraph" && cleanWhitespace(block.text).length > 80
  );
  const text = cleanWhitespace(paragraph?.text || entry.blocks?.[0]?.text || "");
  if (text.length <= 155) return text;
  return `${text.slice(0, 155).replace(/\s+\S*$/, "")}…`;
}

entries.forEach((entry, index) => {
  entry.date = displayDates[index] || entry.date;
  entry.dateIso = displayDateIsos[index] || "";
  entry.part = partLabels[index] || "";
  if (entry.slug === "the-flying-out") entry.title = "The Flight Out";
  if (entry.slug === "a-sad-news-the-last-dervish-of-qadian") {
    entry.title = "Sad News: The Last Dervish of Qadian";
  }
  entry.chapterNumber = index + 1;
  entry.excerpt = excerptFor(entry);
  entry.photos = photoManifest
    .filter((photo) => photo.sessionSlug === entry.slug)
    .map((photo) => ({
      src: photo.src,
      alt: photo.alt,
      caption: photo.caption,
      kind: photo.kind || "photo",
      orientation: photo.orientation || "landscape",
      width: Number(photo.width) || undefined,
      height: Number(photo.height) || undefined,
      variants: Array.isArray(photo.variants)
        ? photo.variants.map((variant) => ({
          src: variant.src,
          width: Number(variant.width) || undefined
        }))
        : []
    }));
});

if (entries.length !== 22) throw new Error(`Expected 22 chapters, received ${entries.length}.`);

const chaptersWithoutPhotos = entries.filter((entry) => !entry.photos.length);
if (chaptersWithoutPhotos.length) {
  throw new Error(
    `Every chapter needs at least one photo. Missing: ${chaptersWithoutPhotos.map((entry) => entry.slug).join(", ")}`
  );
}

const slugs = new Set(entries.map((entry) => entry.slug));
if (slugs.size !== entries.length) throw new Error("Diary chapter slugs must be unique.");

for (const [index, photo] of photoManifest.entries()) {
  if (!slugs.has(photo.sessionSlug)) {
    throw new Error(`Photo ${index + 1} references an unknown chapter: ${photo.sessionSlug}`);
  }
  if (![photo.src, photo.alt, photo.caption].every(cleanWhitespace)) {
    throw new Error(`Photo ${index + 1} needs a source path, alt text, and caption.`);
  }
  if (!["photo", "illustration"].includes(photo.kind || "photo")) {
    throw new Error(`Photo ${index + 1} has an unsupported kind: ${photo.kind}`);
  }
  const photoPath = path.resolve(projectDir, photo.src);
  if (!photoPath.startsWith(`${projectDir}${path.sep}`) || !fs.existsSync(photoPath)) {
    throw new Error(`Photo ${index + 1} is missing or outside the project: ${photo.src}`);
  }
  const variantWidths = new Set();
  for (const [variantIndex, variant] of (photo.variants || []).entries()) {
    if (!cleanWhitespace(variant.src) || !(Number(variant.width) > 0)) {
      throw new Error(`Photo ${index + 1}, variant ${variantIndex + 1} needs a source path and positive width.`);
    }
    if (variantWidths.has(Number(variant.width))) {
      throw new Error(`Photo ${index + 1} has duplicate responsive variant widths.`);
    }
    variantWidths.add(Number(variant.width));
    const variantPath = path.resolve(projectDir, variant.src);
    if (!variantPath.startsWith(`${projectDir}${path.sep}`) || !fs.existsSync(variantPath)) {
      throw new Error(`Photo ${index + 1}, variant ${variantIndex + 1} is missing or outside the project: ${variant.src}`);
    }
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

function mediaTypeFor(source) {
  const extension = path.extname(String(source || "")).toLowerCase();
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

function renderChapterList() {
  return entries.map((entry, index) => {
    const number = String(index + 1).padStart(2, "0");
    const date = `${entry.date}${entry.part ? ` · ${entry.part}` : ""}`;
    return `        <li class="chapter-row list-group-item p-0">
          <a href="sessions/${escapeHtml(entry.slug)}.html" data-chapter-slug="${escapeHtml(entry.slug)}" data-chapter-number="${index + 1}" data-chapter-title="${escapeHtml(entry.title)}">
            <span class="chapter-number" aria-hidden="true">${number}</span>
            <span class="chapter-summary">
              <span class="chapter-name">${escapeHtml(entry.title)}</span>
              <span class="chapter-date">${escapeHtml(date)}</span>
            </span>
            <span class="chapter-arrow" aria-hidden="true">→</span>
            <span class="sr-only">Read Chapter ${index + 1}</span>
          </a>
        </li>`;
  }).join("\n");
}

function renderBlock(block) {
  if (!block || !block.type) return "";
  if (block.type === "heading") return `<h2>${escapeHtml(block.text)}</h2>`;
  if (block.type === "quote") {
    const cite = block.cite ? `<cite>${escapeHtml(block.cite)}</cite>` : "";
    return `<blockquote><p>${escapeHtml(block.text).replaceAll("\n", "<br>\n")}</p>${cite}</blockquote>`;
  }
  if (block.type === "list" && Array.isArray(block.items)) {
    return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }
  return `<p>${escapeHtml(block.text)}</p>`;
}

function renderPhoto(photo, options = {}) {
  if (!photo) return "";
  const { inGallery = false, index = 0, total = 1 } = options;
  const dimensions = Number(photo.width) > 0 && Number(photo.height) > 0
    ? ` width="${Number(photo.width)}" height="${Number(photo.height)}"`
    : "";
  const responsiveSources = Array.isArray(photo.variants) && photo.variants.length
    ? [...photo.variants, { src: photo.src, width: photo.width }]
      .filter((variant) => cleanWhitespace(variant.src) && Number(variant.width) > 0)
      .sort((a, b) => Number(a.width) - Number(b.width))
    : [];
  const srcset = responsiveSources.length
    ? ` srcset="${responsiveSources.map((variant) => `../${escapeHtml(variant.src)} ${Number(variant.width)}w`).join(", ")}"`
    : "";
  const loading = index === 0
    ? 'loading="eager" fetchpriority="high"'
    : 'loading="lazy" fetchpriority="low"';
  const group = inGallery
    ? ` role="group" aria-label="Photo ${index + 1} of ${total}"`
    : "";
  const caption = `<span class="photo-caption">${escapeHtml(photo.caption)}</span>`;
  return `
      <figure class="chapter-photo${inGallery ? " gallery-slide" : ""}${photo.kind === "illustration" ? " chapter-illustration" : ""} ${escapeHtml(photo.orientation)}"${group}>
        <img src="../${escapeHtml(photo.src)}"${srcset} alt="${escapeHtml(photo.alt)}"${dimensions} ${loading} decoding="async" sizes="(max-width: 520px) calc(100vw - 24px), (max-width: 800px) calc(100vw - 32px), 760px">
        <figcaption>${caption}
        </figcaption>
      </figure>`;
}

function renderGallery(photos, chapterNumber) {
  if (!Array.isArray(photos) || !photos.length) return "";
  if (photos.length === 1) return renderPhoto(photos[0]);

  const galleryId = `chapter-${chapterNumber}-gallery`;
  const slides = photos.map((photo, index) => renderPhoto(photo, {
    inGallery: true,
    index,
    total: photos.length
  })).join("");

  return `
      <section class="chapter-gallery" data-gallery aria-label="Chapter photos">
        <div class="gallery-viewport" data-gallery-viewport tabindex="0" role="group" aria-roledescription="carousel" aria-label="Photo carousel; use left and right arrow keys" aria-describedby="${galleryId}-status">
          <div class="gallery-track">${slides}
          </div>
        </div>
        <div class="gallery-controls">
          <button class="gallery-button" type="button" data-gallery-previous aria-label="Previous photo">
            <span aria-hidden="true">←</span>
          </button>
          <p class="gallery-status" id="${galleryId}-status" aria-live="polite" aria-atomic="true">
            <span data-gallery-current>1</span> / ${photos.length}
          </p>
          <button class="gallery-button" type="button" data-gallery-next aria-label="Next photo">
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>`;
}

function navigationLink(entry, direction) {
  if (!entry) return "";
  const chapter = String(entry.chapterNumber).padStart(2, "0");
  const label = direction === "previous" ? "Previous" : "Next";
  const arrow = direction === "previous" ? "←" : "→";
  return `
        <a class="chapter-nav-link ${direction}" href="${escapeHtml(entry.slug)}.html">
          <span class="nav-direction">${direction === "previous" ? `${arrow} ${label}` : `${label} ${arrow}`}</span>
          <span class="nav-chapter">Chapter ${chapter}</span>
          <span class="nav-title">${escapeHtml(entry.title)}</span>
        </a>`;
}

function chapterPage(entry, index) {
  const previous = entries[index - 1];
  const next = entries[index + 1];
  const number = String(index + 1).padStart(2, "0");
  const canonical = `https://anasmangla.github.io/qadian1/sessions/${entry.slug}.html`;
  const description = entry.excerpt || `Chapter ${number} of The Qadian Diary by Anas Mangla.`;
  const photo = entry.photos?.[0];
  const photoUrl = photo ? `https://anasmangla.github.io/qadian1/${photo.src}` : "";
  const photoMeta = photoUrl
    ? `\n  <meta property="og:image" content="${photoUrl}">\n  <meta property="og:image:alt" content="${escapeHtml(photo.alt)}">\n  <meta property="og:image:width" content="${Number(photo.width)}">\n  <meta property="og:image:height" content="${Number(photo.height)}">\n  <meta property="og:image:type" content="${mediaTypeFor(photo.src)}">`
    : "";
  const dateLine = `${entry.date}${entry.part ? ` · ${entry.part}` : ""}`;
  const dateMarkup = entry.dateIso
    ? `<time datetime="${escapeHtml(entry.dateIso)}">${escapeHtml(dateLine)}</time>`
    : escapeHtml(dateLine);
  const publishedMeta = entry.dateIso
    ? `\n  <meta property="article:published_time" content="${escapeHtml(entry.dateIso)}">`
    : "";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entry.title,
    description,
    author: { "@type": "Person", name: "Anas Mangla" },
    mainEntityOfPage: canonical,
    isPartOf: {
      "@type": "Book",
      name: "The Qadian Diary",
      url: "https://anasmangla.github.io/qadian1/"
    },
    ...(entry.dateIso ? { datePublished: entry.dateIso } : {}),
    ...(photoUrl ? { image: photoUrl } : {})
  };
  const structuredJson = JSON.stringify(structuredData, null, 2).replaceAll("<", "\\u003c");
  const adjacentLinks = [
    previous ? `<link rel="prev" href="${escapeHtml(previous.slug)}.html">` : "",
    next ? `<link rel="next" href="${escapeHtml(next.slug)}.html">` : "",
    next ? `<link rel="prefetch" href="${escapeHtml(next.slug)}.html">` : ""
  ].filter(Boolean).join("\n  ");
  const progress = ((index + 1) / entries.length * 100).toFixed(2);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f79007">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="Anas Mangla">
  <meta property="og:title" content="${escapeHtml(entry.title)} | The Qadian Diary">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="The Qadian Diary">
  <meta property="og:url" content="${canonical}">
  ${photoMeta}${publishedMeta}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(entry.title)} | The Qadian Diary">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${photoUrl ? `<meta name="twitter:image" content="${photoUrl}">\n  <meta name="twitter:image:alt" content="${escapeHtml(photo.alt)}">` : ""}
  <link rel="canonical" href="${canonical}">
  <link rel="icon" type="image/png" href="../assets/ahmadiyya-logo.png">
  ${adjacentLinks}
  <title>Chapter ${number}: ${escapeHtml(entry.title)} | The Qadian Diary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&amp;family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&amp;display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
  <link rel="stylesheet" href="../styles.css?v=7">
  <script type="application/ld+json">
${structuredJson.split("\n").map((line) => `  ${line}`).join("\n")}
  </script>
</head>
<body class="session-page" data-chapter-slug="${escapeHtml(entry.slug)}" data-chapter-number="${index + 1}" data-chapter-title="${escapeHtml(entry.title)}">
  <a class="skip-link" href="#chapter-content">Skip to the chapter</a>

  <header class="reader-header">
    <div class="container header-inner">
      <a class="wordmark" href="../index.html">
        <img class="site-emblem" src="../assets/ahmadiyya-logo.png" alt="" width="36" height="35">
        <span>The Qadian Diary</span>
      </a>
      <span class="author">Anas Mangla</span>
    </div>
  </header>

  <main id="chapter-content" tabindex="-1">
    <article class="chapter container">
      <header class="chapter-heading">
        <p class="chapter-count">Chapter ${index + 1} of ${entries.length}</p>
        <div class="chapter-progress" role="progressbar" aria-label="Diary progress" aria-valuemin="0" aria-valuemax="${entries.length}" aria-valuenow="${index + 1}" aria-valuetext="Chapter ${index + 1} of ${entries.length}">
          <span style="width: ${progress}%"></span>
        </div>
        <h1>${escapeHtml(entry.title)}</h1>
        <p class="chapter-date">${dateMarkup}</p>
      </header>
      ${renderGallery(entry.photos, number)}
      <div class="chapter-body">
        ${(entry.blocks || []).map(renderBlock).join("\n        ")}
      </div>
      <nav class="chapter-navigation" aria-label="Previous and next chapters">
        ${navigationLink(previous, "previous")}
        ${navigationLink(next, "next")}
      </nav>
    </article>
  </main>
  <script src="../reader.js?v=1" defer></script>
  <script src="../gallery.js?v=3" defer></script>
</body>
</html>
`;
}

fs.mkdirSync(sessionsDir, { recursive: true });
for (const file of fs.readdirSync(sessionsDir)) {
  if (file.endsWith(".html")) fs.unlinkSync(path.join(sessionsDir, file));
}

entries.forEach((entry, index) => {
  const html = chapterPage(entry, index).replace(/[ \t]+$/gm, "");
  fs.writeFileSync(path.join(sessionsDir, `${entry.slug}.html`), html);
});

fs.writeFileSync(
  path.join(projectDir, "diary-data.js"),
  `window.QADIAN_DIARY_ENTRIES = ${JSON.stringify(entries, null, 2)};\n`
);

const chapterListStart = "<!-- chapter-list:start -->";
const chapterListEnd = "<!-- chapter-list:end -->";
const indexHtml = fs.readFileSync(indexPath, "utf8");
const startAt = indexHtml.indexOf(chapterListStart);
const endAt = indexHtml.indexOf(chapterListEnd);
if (startAt < 0 || endAt < 0 || endAt < startAt) {
  throw new Error("index.html needs chapter-list build markers.");
}
const chapterListHtml = `${chapterListStart}\n${renderChapterList()}\n        ${chapterListEnd}`;
const builtIndexHtml = `${indexHtml.slice(0, startAt)}${chapterListHtml}${indexHtml.slice(endAt + chapterListEnd.length)}`;
fs.writeFileSync(indexPath, builtIndexHtml);

const sitemapUrls = [
  "https://anasmangla.github.io/qadian1/",
  ...entries.map((entry) => `https://anasmangla.github.io/qadian1/sessions/${entry.slug}.html`)
];

fs.writeFileSync(
  path.join(projectDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`
);

console.log(`Built ${entries.length} diary chapters.`);
