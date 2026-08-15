(function () {
  "use strict";

  const navToggle = document.querySelector(".nav-toggle");
  const primaryNav = document.getElementById("primary-nav");
  const progressBar = document.getElementById("reading-progress-bar");
  const lightbox = document.getElementById("photo-lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.querySelector(".lightbox-close");
  const mobileNavigation = window.matchMedia("(max-width: 767px)");

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

  document.addEventListener("click", (event) => {
    const photoButton = event.target.closest(".photo-open");
    if (!photoButton || !lightbox || !lightboxImage || !lightboxCaption) return;

    lightboxImage.src = photoButton.dataset.photoSrc || "";
    lightboxImage.alt = photoButton.dataset.photoAlt || "Trip photo";
    lightboxCaption.textContent = photoButton.dataset.photoCaption || "";
    lightbox.showModal();
  });

  lightboxClose?.addEventListener("click", () => lightbox.close());
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox?.addEventListener("close", () => {
    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
    lightboxCaption.textContent = "";
  });

  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    progressBar.style.width = `${progress * 100}%`;
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  syncNavigationMode();
  updateProgress();
}());
