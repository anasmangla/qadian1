# The Qadian Diary

A responsive, searchable digital edition of Anas Mangla's 2024 Qadian travel diary.

## Features

- Day-by-day timeline with one dedicated page per diary session
- Date-matched photographs from the 2024 journey, with captions and an accessible lightbox
- Previous and next navigation between multi-part sessions
- Search by date, place, person, or theme
- Reading-progress indicator
- Accessible keyboard and screen-reader behavior
- Responsive layouts for phone, tablet, and desktop
- Print-friendly styling
- Visual system based on the live Anasonix website

The published photo assets are web-optimized copies with embedded camera and location metadata removed.

## Rebuild the session pages

The cleaned diary source is stored in `data/`. After editing that source or `photo-manifest.json`, regenerate the individual pages and search data with:

```bash
node scripts/build-sessions.mjs
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

The site uses relative asset paths and requires no build step.
