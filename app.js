(function () {
  "use strict";

  const entries = Array.isArray(window.QADIAN_DIARY_ENTRIES) ? window.QADIAN_DIARY_ENTRIES : [];
  const entryList = document.getElementById("entry-list");
  const timelineNav = document.getElementById("timeline-nav");
  const searchInput = document.getElementById("diary-search");
  const clearSearch = document.getElementById("clear-search");
  const searchStatus = document.getElementById("search-status");
  const navToggle = document.querySelector(".nav-toggle");
  const primaryNav = document.getElementById("primary-nav");
  const progressBar = document.getElementById("reading-progress-bar");
  const mainNavLinks = Array.from(document.querySelectorAll(".primary-nav a"));
  const mobileNavigation = window.matchMedia("(max-width: 767px)");

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function entrySearchText(entry) {
    const blocks = (entry.blocks || []).flatMap((block) => [block.text || "", ...(block.items || [])]);
    return [entry.date, entry.title, entry.subtitle || "", entry.section || "", ...blocks]
      .join(" ")
      .toLocaleLowerCase();
  }

  function pageLabel(entry) {
    const pages = Array.isArray(entry.printedPages) ? entry.printedPages : [];
    if (!pages.length) return "";
    return pages.length === 1 ? `Original page ${pages[0]}` : `Original pages ${pages[0]}-${pages[pages.length - 1]}`;
  }

  function renderEntries() {
    if (!entries.length) {
      entryList.innerHTML = '<div class="empty-state"><h3>The diary is being prepared.</h3><p>Please return after the session pages have been added.</p></div>';
      return;
    }

    timelineNav.innerHTML = entries.map((entry) => (
      `<a class="timeline-link" href="sessions/${escapeHtml(entry.slug)}.html" data-entry-link="${escapeHtml(entry.slug)}">${escapeHtml(entry.shortDate || entry.date)}${entry.part ? ` · ${escapeHtml(entry.part)}` : ""}</a>`
    )).join("");

    let currentSection = "";
    const cards = [];
    entries.forEach((entry, index) => {
      if (entry.section && entry.section !== currentSection) {
        currentSection = entry.section;
        cards.push(`<div class="session-group-heading"><span>${escapeHtml(currentSection)}</span></div>`);
      }

      const pageText = pageLabel(entry);
      const meta = [
        entry.readingMinutes ? `${entry.readingMinutes} min read` : "",
        pageText
      ].filter(Boolean).join(" · ");
      const photo = Array.isArray(entry.photos) ? entry.photos[0] : null;
      const dimensions = photo && Number(photo.width) > 0 && Number(photo.height) > 0
        ? ` width="${Number(photo.width)}" height="${Number(photo.height)}"`
        : "";
      const photoMarkup = photo
        ? `<span class="session-card-media"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}"${dimensions} loading="lazy" decoding="async"></span>`
        : "";

      cards.push(`
        <article class="session-card" id="session-${escapeHtml(entry.slug)}" data-search="${escapeHtml(entrySearchText(entry))}">
          <a class="session-card-link${photo ? " has-photo" : ""}" href="sessions/${escapeHtml(entry.slug)}.html" aria-label="Read ${escapeHtml(entry.title)}">
            ${photoMarkup}
            <div class="session-card-copy">
              <span class="session-index">Session ${String(index + 1).padStart(2, "0")}</span>
              <span class="entry-date">${escapeHtml(entry.date)}${entry.part ? ` · ${escapeHtml(entry.part)}` : ""}</span>
              <h3 class="entry-title">${escapeHtml(entry.title)}</h3>
              ${entry.excerpt ? `<p class="session-excerpt">${escapeHtml(entry.excerpt)}</p>` : ""}
              <span class="session-card-footer">
                <span>${escapeHtml(meta)}</span>
                <strong>Read this session</strong>
              </span>
            </div>
          </a>
        </article>`);
    });
    cards.push('<div class="empty-state" id="search-empty" hidden><h3>No sessions found</h3><p>Try a different date, place, person, or theme.</p></div>');
    entryList.innerHTML = cards.join("");

    observeEntries();
  }

  function updateSearch() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const cards = Array.from(document.querySelectorAll(".session-card"));
    let visible = 0;

    cards.forEach((card) => {
      const match = !query || card.dataset.search.includes(query);
      card.hidden = !match;
      if (match) visible += 1;
    });

    document.querySelectorAll(".timeline-link").forEach((link) => {
      const card = document.getElementById(`session-${link.dataset.entryLink}`);
      link.hidden = Boolean(card && card.hidden);
    });

    document.querySelectorAll(".session-group-heading").forEach((heading) => {
      let next = heading.nextElementSibling;
      let hasVisibleCard = false;
      while (next && !next.classList.contains("session-group-heading")) {
        if (next.classList.contains("session-card") && !next.hidden) hasVisibleCard = true;
        next = next.nextElementSibling;
      }
      heading.hidden = !hasVisibleCard;
    });

    clearSearch.hidden = !query;
    const emptyState = document.getElementById("search-empty");
    if (emptyState) emptyState.hidden = visible > 0;
    searchStatus.textContent = query
      ? `${visible} ${visible === 1 ? "session" : "sessions"} found for “${searchInput.value.trim()}”.`
      : `${entries.length} diary ${entries.length === 1 ? "session" : "sessions"}.`;
  }

  function observeEntries() {
    if (!("IntersectionObserver" in window)) return;
    const links = new Map(Array.from(document.querySelectorAll(".timeline-link")).map((link) => [link.dataset.entryLink, link]));
    const observer = new IntersectionObserver((observed) => {
      observed.forEach((item) => {
        if (!item.isIntersecting) return;
        links.forEach((link) => link.removeAttribute("aria-current"));
        const active = links.get(item.target.id.replace("session-", ""));
        if (active) {
          active.setAttribute("aria-current", "location");
          if (mobileNavigation.matches) {
            const centeredLeft = active.offsetLeft - ((timelineNav.clientWidth - active.clientWidth) / 2);
            timelineNav.scrollTo({ left: Math.max(0, centeredLeft), behavior: "smooth" });
          } else {
            active.scrollIntoView({ block: "nearest", inline: "nearest" });
          }
        }
      });
    }, { rootMargin: "-25% 0px -65%", threshold: 0 });

    document.querySelectorAll(".session-card").forEach((entry) => observer.observe(entry));
  }

  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    progressBar.style.width = `${progress * 100}%`;
  }

  function updateMainNav() {
    const sections = ["journey", "diary", "reflections"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const marker = window.scrollY + 180;
    let activeId = "";

    sections.forEach((section) => {
      if (section.offsetTop <= marker) activeId = section.id;
    });

    mainNavLinks.forEach((link) => {
      if (link.getAttribute("href") === `#${activeId}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function syncNavigationMode() {
    if (mobileNavigation.matches) {
      const isOpen = primaryNav.classList.contains("is-open");
      primaryNav.toggleAttribute("inert", !isOpen);
      primaryNav.setAttribute("aria-hidden", String(!isOpen));
      return;
    }

    primaryNav.classList.remove("is-open");
    primaryNav.removeAttribute("inert");
    primaryNav.removeAttribute("aria-hidden");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation menu");
    navToggle.textContent = "Menu";
    document.body.classList.remove("nav-open");
  }

  function closeNavigation(restoreFocus = false) {
    primaryNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation menu");
    navToggle.textContent = "Menu";
    document.body.classList.remove("nav-open");
    syncNavigationMode();
    if (restoreFocus) navToggle.focus();
  }

  navToggle.addEventListener("click", () => {
    const willOpen = !primaryNav.classList.contains("is-open");
    primaryNav.classList.toggle("is-open", willOpen);
    navToggle.setAttribute("aria-expanded", String(willOpen));
    navToggle.setAttribute("aria-label", willOpen ? "Close navigation menu" : "Open navigation menu");
    navToggle.textContent = willOpen ? "Close" : "Menu";
    document.body.classList.toggle("nav-open", willOpen);
    syncNavigationMode();
    if (willOpen) primaryNav.querySelector("a")?.focus();
  });

  primaryNav.addEventListener("click", (event) => {
    if (event.target.matches("a")) closeNavigation();
  });

  document.addEventListener("keydown", (event) => {
    if (!primaryNav.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      closeNavigation(true);
      return;
    }
    if (event.key !== "Tab" || !mobileNavigation.matches) return;

    const focusable = [navToggle, ...primaryNav.querySelectorAll("a")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  mobileNavigation.addEventListener("change", syncNavigationMode);

  searchInput.addEventListener("input", updateSearch);
  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    updateSearch();
    searchInput.focus();
  });

  window.addEventListener("scroll", () => {
    updateProgress();
    updateMainNav();
  }, { passive: true });

  renderEntries();
  syncNavigationMode();
  updateSearch();
  updateProgress();
  updateMainNav();
}());
