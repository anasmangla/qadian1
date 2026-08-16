# The Qadian Diary

A focused digital edition of Anas Mangla's 2024 Qadian travel diary.

## Features

- A clean index of 22 numbered chapters
- One dedicated reading page per chapter
- Previous and next chapter navigation
- A private, on-device “Continue reading” link
- Chapter-position progress and automatic dark reading mode
- Distinct personal photographs selected for chapter relevance, with factual captions and capture-date verification where source metadata is available
- Original local diary illustrations where no honest personal photograph exists; no stock or generic web imagery
- Accessible, responsive layouts for phone, tablet, and desktop
- Accessible photo-carousel controls and working skip links
- Chapter-level social previews, structured article metadata, and a themed 404 page
- Print-friendly styling
- Bootstrap 5.3.8 for the responsive grid and cross-browser foundation
- Visual system based on the live Anasonix website

The published personal-photo assets are naturally corrected, web-optimized copies with embedded camera and location metadata removed. Each photograph has a 480px candidate plus larger candidates up to the source image’s true resolution; images are never upscaled merely to manufacture a 960px or 1600px file. The builder emits the matching `srcset` automatically. Original SVG diary illustrations scale cleanly at every viewport size without raster variants.

## Rebuild the chapter pages

The cleaned diary source is stored in `data/`. After editing that source or `photo-manifest.json`, regenerate the chapter pages and index data with:

```bash
node scripts/build-sessions.mjs
```

Validate chapter generation, navigation, local assets, responsive image candidates, and the no-stock/no-duplicate image policy with:

```bash
node scripts/validate-site.mjs
```

The same checks run automatically in GitHub Actions on pushes and pull requests.

To remove embedded capture and editing metadata after exporting new personal JPEGs, run:

```bash
node scripts/strip-jpeg-metadata.mjs
```

## Local preview

Run any static file server from this directory, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Deployment

This project is designed for GitHub Pages at:

`https://anasmangla.github.io/qadian1/`

GitHub Pages publishes directly from the root of `main`. The site uses relative asset paths and requires no deployment build step.
