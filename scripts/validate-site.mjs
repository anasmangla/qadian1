import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const sessionsDir = path.join(projectDir, "sessions");
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(projectDir, relativePath), "utf8");
}

function clean(value) {
  return String(value ?? "").trim();
}

function localTarget(pagePath, rawTarget) {
  const target = rawTarget.replaceAll("&amp;", "&").split(/[?#]/, 1)[0];
  if (!target || target.startsWith("#") || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(target)) return null;
  return path.resolve(path.dirname(pagePath), target);
}

const entries = [1, 2, 3].flatMap((number) => JSON.parse(read(`data/batch${number}.json`)));
const manifest = JSON.parse(read("photo-manifest.json"));
const indexHtml = read("index.html");
const notFoundHtml = read("404.html");
const slugs = entries.map((entry) => entry.slug);
const slugSet = new Set(slugs);
const usedPrimaryAssets = new Set();

check(entries.length === 22, `Expected 22 diary entries, received ${entries.length}.`);
check(slugSet.size === 22, "Diary chapter slugs must be unique.");
check(manifest.length >= 22, `Expected at least 22 photo placements, received ${manifest.length}.`);

for (const [index, photo] of manifest.entries()) {
  const label = `Photo ${index + 1}`;
  check(slugSet.has(photo.sessionSlug), `${label} uses an unknown sessionSlug: ${photo.sessionSlug}`);
  check([photo.src, photo.alt, photo.caption].every(clean), `${label} needs src, alt, and caption metadata.`);
  check(["photo", "illustration"].includes(photo.kind), `${label} needs kind photo or illustration.`);
  check(["landscape", "portrait"].includes(photo.orientation), `${label} needs a valid orientation.`);
  check(Number(photo.width) > 0 && Number(photo.height) > 0, `${label} needs positive width and height metadata.`);
  check(!clean(photo.src).startsWith("assets/photos/reference/"), `${label} must not use a reference or stock image.`);
  check(!usedPrimaryAssets.has(clean(photo.src)), `${label} duplicates an image already assigned to another chapter.`);
  usedPrimaryAssets.add(clean(photo.src));

  const assetPath = path.resolve(projectDir, clean(photo.src));
  check(assetPath.startsWith(`${projectDir}${path.sep}`), `${label} points outside the project.`);
  check(fs.existsSync(assetPath), `${label} asset is missing: ${photo.src}`);

  if (photo.kind === "photo") {
    check(clean(photo.src).startsWith("assets/photos/personal/curated/"), `${label} personal photo must use the curated personal-photo directory.`);
    check((photo.variants || []).length === 2, `${label} personal photo needs 480px and 960px responsive variants.`);
  } else {
    check(clean(photo.src).startsWith("assets/illustrations/source/") && clean(photo.src).endsWith(".svg"), `${label} illustration must use an original local SVG.`);
    check((photo.variants || []).length === 0, `${label} SVG illustration should scale responsively without raster variants.`);
    if (fs.existsSync(assetPath)) {
      check(fs.readFileSync(assetPath, "utf8").includes("<svg"), `${label} illustration is not valid SVG source.`);
    }
  }

  const externalAttribution = [
    photo.credit,
    photo.attribution,
    photo.creditUrl,
    photo.sourceUrl,
    photo.license,
    photo.licenseUrl,
    photo.modified,
    photo.adaptationLicense
  ];
  check(!externalAttribution.some(clean), `${label} must not retain external attribution, source, license, or adaptation metadata.`);

  const variantWidths = new Set();
  for (const [variantIndex, variant] of (photo.variants || []).entries()) {
    check(clean(variant.src), `${label}, variant ${variantIndex + 1} needs a source path.`);
    check(Number(variant.width) > 0, `${label}, variant ${variantIndex + 1} needs a positive width.`);
    check(!variantWidths.has(Number(variant.width)), `${label} has duplicate responsive variant widths.`);
    variantWidths.add(Number(variant.width));
    const variantPath = path.resolve(projectDir, clean(variant.src));
    check(variantPath.startsWith(`${projectDir}${path.sep}`), `${label}, variant ${variantIndex + 1} points outside the project.`);
    check(fs.existsSync(variantPath), `${label}, variant ${variantIndex + 1} asset is missing: ${variant.src}`);
  }
  if (photo.kind === "photo") {
    check(variantWidths.has(480) && variantWidths.has(960), `${label} is missing its 480px or 960px responsive candidate.`);
  }
}

const personalJpegs = new Set(
  manifest
    .filter((photo) => photo.kind === "photo")
    .flatMap((photo) => [photo.src, ...(photo.variants || []).map((variant) => variant.src)])
);

check(manifest[0]?.src.endsWith("chapter-01-toronto-airport.svg"), "Chapter 1 must use the Toronto Pearson airport-sign illustration.");
check(manifest[1]?.src.endsWith("chapter-02-flight-out.svg"), "Chapter 2 must use the right-facing airplane illustration.");
const chapterSix = manifest.filter((photo) => photo.sessionSlug === "a-day-of-plans-changes-and-timeless-wonders");
check(chapterSix[0]?.src.includes("red-fort-flag") && chapterSix[1]?.src.includes("qutub-minar-detail"), "Chapter 6 photo order must be Red Fort first and Qutub Minar second.");
check(manifest.find((photo) => photo.sessionSlug === "a-day-at-the-taj-mahal")?.src.includes("taj-mahal-reflection"), "Chapter 7 must lead with the personal full-view Taj Mahal photo.");

for (const relativePath of personalJpegs) {
  const image = fs.readFileSync(path.join(projectDir, relativePath));
  check(image[0] === 0xff && image[1] === 0xd8, `Personal image is not a JPEG: ${relativePath}`);
  check(!image.includes(Buffer.from("Exif\0\0")), `Personal image still contains EXIF metadata: ${relativePath}`);
  check(!image.includes(Buffer.from("<x:xmpmeta")), `Personal image still contains XMP metadata: ${relativePath}`);
  check(!image.includes(Buffer.from("Photoshop 3.0")), `Personal image still contains Photoshop/IPTC metadata: ${relativePath}`);
}

for (const slug of slugs) {
  check(manifest.some((photo) => photo.sessionSlug === slug), `Chapter has no photo placement: ${slug}`);
}

const sessionFiles = fs.readdirSync(sessionsDir).filter((file) => file.endsWith(".html")).sort();
check(sessionFiles.length === 22, `Expected 22 generated session pages, received ${sessionFiles.length}.`);
check((indexHtml.match(/class="chapter-row /g) || []).length === 22, "index.html must contain all 22 chapters without JavaScript.");
check(indexHtml.includes("<!-- chapter-list:start -->") && indexHtml.includes("<!-- chapter-list:end -->"), "index.html is missing chapter-list build markers.");
check(/<ol\b[^>]*\bid="chapter-list"[^>]*\brole="list"/.test(indexHtml), "The static chapter index must preserve list semantics.");
check(/<section\b[^>]*\bid="chapters"[^>]*\btabindex="-1"/.test(indexHtml), "The chapter skip-link target must be programmatically focusable.");
check(!indexHtml.includes("diary-data.js"), "The home page should not load the full diary dataset.");
check(indexHtml.includes('name="twitter:card" content="summary_large_image"'), "The home page is missing Twitter card metadata.");
check(indexHtml.includes('property="og:image:alt"'), "The home page is missing Open Graph image alt text.");
check(indexHtml.includes('class="site-emblem" src="assets/ahmadiyya-logo.png"'), "The home page is missing the Ahmadiyya emblem.");
check(indexHtml.includes('rel="icon" type="image/png" href="assets/ahmadiyya-logo.png"'), "The home page is missing the Ahmadiyya favicon.");
check(indexHtml.includes('href="styles.css?v=7"'), "The home page stylesheet version is stale.");
check(indexHtml.includes("qadian-route-cover-v2.webp"), "The home page must use the corrected eastbound cover image.");
check(indexHtml.includes("right-facing airplane flying from Toronto"), "The cover alt text must identify the west-to-east plane direction.");
check(notFoundHtml.includes('name="robots" content="noindex"'), "404.html must be excluded from search indexing.");
check(notFoundHtml.includes('href="https://anasmangla.github.io/qadian1/"'), "404.html needs a link back to the diary.");
check(notFoundHtml.includes('href="https://anasmangla.github.io/qadian1/styles.css?v=7"'), "404.html stylesheet version is stale.");

slugs.forEach((slug, index) => {
  const fileName = `${slug}.html`;
  const html = read(`sessions/${fileName}`);
  const previous = slugs[index - 1];
  const next = slugs[index + 1];
  const chapterNumber = index + 1;

  check(indexHtml.includes(`href="sessions/${fileName}" data-chapter-slug="${slug}" data-chapter-number="${chapterNumber}"`), `Home chapter link is missing or out of order: ${slug}`);
  check(html.includes(`data-chapter-slug="${slug}" data-chapter-number="${chapterNumber}"`), `Chapter dataset metadata is wrong: ${slug}`);
  check(html.includes(`Chapter ${chapterNumber} of 22`), `Chapter count is wrong: ${slug}`);
  check(html.includes('aria-valuemin="0"'), `Progress minimum is wrong: ${slug}`);
  check(html.includes(`aria-valuenow="${chapterNumber}"`), `Progress value is wrong: ${slug}`);
  check(html.includes(`aria-valuetext="Chapter ${chapterNumber} of 22"`), `Progress text is wrong: ${slug}`);
  check(html.includes("Source+Serif+4"), `Source Serif 4 is missing: ${slug}`);
  check(html.includes("../reader.js?v=1"), `Reading-position script is missing: ${slug}`);
  check(/<main\b[^>]*\bid="chapter-content"[^>]*\btabindex="-1"/.test(html), `Chapter skip-link target is not focusable: ${slug}`);
  check(/<img [^>]*sizes="\(max-width: 520px\)[^"]*\(max-width: 800px\)/.test(html), `Responsive image sizing is missing: ${slug}`);
  check(html.includes('class="site-emblem" src="../assets/ahmadiyya-logo.png"'), `The Ahmadiyya emblem is missing: ${slug}`);
  check(html.includes('rel="icon" type="image/png" href="../assets/ahmadiyya-logo.png"'), `The Ahmadiyya favicon is missing: ${slug}`);
  check(html.includes('name="twitter:card" content="summary_large_image"'), `Twitter card metadata is missing: ${slug}`);
  check(html.includes('property="og:image:alt"'), `Open Graph image alt text is missing: ${slug}`);
  check(html.includes('property="og:image:width"') && html.includes('property="og:image:height"'), `Open Graph image dimensions are missing: ${slug}`);
  check(html.includes('"@type": "Article"'), `Article structured data is missing: ${slug}`);
  check(html.includes('href="../styles.css?v=7"'), `Chapter stylesheet version is stale: ${slug}`);
  if (index < slugs.length - 1) {
    check(/<time datetime="2024-\d{2}-\d{2}">/.test(html), `Machine-readable chapter date is missing: ${slug}`);
    check(html.includes('property="article:published_time"'), `Published-time metadata is missing: ${slug}`);
  }
  const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1] || "";
  check(description.length > 0 && description.length <= 160, `Meta description must be 160 characters or fewer: ${slug}`);
  const photos = manifest.filter((photo) => photo.sessionSlug === slug);
  if (photos.some((photo) => Array.isArray(photo.variants) && photo.variants.length)) {
    check(/<img [^>]*srcset="/.test(html), `Responsive image variants are not rendered: ${slug}`);
  }
  if (photos.length > 1) {
    check(html.includes('role="group" aria-roledescription="carousel"'), `Photo carousel semantics are missing: ${slug}`);
    check(html.includes('aria-label="Photo carousel; use left and right arrow keys"'), `Photo carousel instructions are missing: ${slug}`);
  }

  if (previous) {
    check(html.includes(`<link rel="prev" href="${previous}.html">`), `Previous resource hint is wrong: ${slug}`);
    check(html.includes(`class="chapter-nav-link previous" href="${previous}.html"`), `Previous navigation is wrong: ${slug}`);
  } else {
    check(!html.includes('rel="prev"'), `First chapter must not have a previous resource hint.`);
    check(!html.includes('class="chapter-nav-link previous"'), `First chapter must not have a previous navigation link.`);
  }

  if (next) {
    check(html.includes(`<link rel="next" href="${next}.html">`), `Next resource hint is wrong: ${slug}`);
    check(html.includes(`<link rel="prefetch" href="${next}.html"`), `Next chapter prefetch is missing: ${slug}`);
    check(html.includes(`class="chapter-nav-link next" href="${next}.html"`), `Next navigation is wrong: ${slug}`);
  } else {
    check(!html.includes('rel="next"'), `Last chapter must not have a next resource hint.`);
    check(!html.includes('class="chapter-nav-link next"'), `Last chapter must not have a next navigation link.`);
  }
});

const htmlFiles = [
  path.join(projectDir, "index.html"),
  path.join(projectDir, "404.html"),
  ...sessionFiles.map((file) => path.join(sessionsDir, file))
];
for (const htmlPath of htmlFiles) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const targets = [
    ...Array.from(html.matchAll(/\b(?:href|src)="([^"]+)"/g), (match) => match[1]),
    ...Array.from(html.matchAll(/\bsrcset="([^"]+)"/g), (match) => match[1].split(",").map((candidate) => candidate.trim().split(/\s+/, 1)[0])).flat()
  ];

  for (const target of targets) {
    const resolved = localTarget(htmlPath, target);
    if (!resolved) continue;
    check(resolved.startsWith(`${projectDir}${path.sep}`), `${path.relative(projectDir, htmlPath)} links outside the project: ${target}`);
    check(fs.existsSync(resolved), `${path.relative(projectDir, htmlPath)} has a missing local target: ${target}`);
  }
}

const sitemapLocations = (read("sitemap.xml").match(/<loc>/g) || []).length;
check(sitemapLocations === 23, `Expected 23 sitemap locations, received ${sitemapLocations}.`);

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} error${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validated ${entries.length} chapters, ${manifest.length} photo placements, and ${htmlFiles.length} HTML pages.`);
