# The Qadian Diary

A focused digital edition of Anas Mangla's 2024 Qadian travel diary.

## Features

- A clean index of 22 numbered chapters
- One dedicated reading page per chapter
- Previous and next chapter navigation
- A private, on-device “Continue reading” link
- Chapter-position progress and automatic dark reading mode
- A restrained set of story-matched photographs with factual captions
- Accessible, responsive layouts for phone, tablet, and desktop
- Print-friendly styling
- Bootstrap 5.3.8 for the responsive grid and cross-browser foundation
- Visual system based on the live Anasonix website

The published photo assets are web-optimized copies with embedded camera and location metadata removed.
Optional responsive copies can be listed in a photo’s `variants` array as `{ "src": "…", "width": 800 }`; the builder will emit the matching `srcset` automatically.

## Rebuild the chapter pages

The cleaned diary source is stored in `data/`. After editing that source or `photo-manifest.json`, regenerate the chapter pages and index data with:

```bash
node scripts/build-sessions.mjs
```

Validate chapter generation, navigation, local assets, and photo licensing with:

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
