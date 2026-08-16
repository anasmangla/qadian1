(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-gallery]").forEach((gallery) => {
    const viewport = gallery.querySelector("[data-gallery-viewport]");
    const slides = Array.from(gallery.querySelectorAll(".gallery-slide"));
    const previousButton = gallery.querySelector("[data-gallery-previous]");
    const nextButton = gallery.querySelector("[data-gallery-next]");
    const currentLabel = gallery.querySelector("[data-gallery-current]");

    if (!viewport || slides.length < 2 || !previousButton || !nextButton || !currentLabel) return;

    let currentIndex = 0;
    let scrollFrame = 0;
    let resizeFrame = 0;

    const clamp = (index) => Math.min(Math.max(index, 0), slides.length - 1);
    const slidePosition = (slide) => slide.offsetLeft - slides[0].offsetLeft;

    function update(index) {
      currentIndex = clamp(index);
      currentLabel.textContent = String(currentIndex + 1);
      previousButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex === slides.length - 1;
    }

    function nearestSlideIndex() {
      return slides.reduce((nearest, slide, index) => {
        const currentDistance = Math.abs(slidePosition(slides[nearest]) - viewport.scrollLeft);
        const candidateDistance = Math.abs(slidePosition(slide) - viewport.scrollLeft);
        return candidateDistance < currentDistance ? index : nearest;
      }, 0);
    }

    function goTo(index, behavior = reducedMotion.matches ? "auto" : "smooth") {
      const nextIndex = clamp(index);
      viewport.scrollTo({ left: slidePosition(slides[nextIndex]), behavior });
      update(nextIndex);
    }

    previousButton.addEventListener("click", () => goTo(currentIndex - 1));
    nextButton.addEventListener("click", () => goTo(currentIndex + 1));

    viewport.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(currentIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(currentIndex + 1);
      }
    });

    viewport.addEventListener("scroll", () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        update(nearestSlideIndex());
      });
    }, { passive: true });

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(() => {
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(() => {
          viewport.scrollTo({ left: slidePosition(slides[currentIndex]), behavior: "auto" });
        });
      });
      resizeObserver.observe(viewport);
    }

    update(0);
  });
})();
