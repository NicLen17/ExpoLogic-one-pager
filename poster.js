(function () {
  "use strict";

  const PAGE_ID = "poster";
  const PAGE_HEIGHT_MM = 1100;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (prefersReducedMotion) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    items.forEach((el) => observer.observe(el));
  }

  function initScreenScale() {
    /* Vista en px legible; el tamaño físico (mm) solo aplica en @media print */
  }

  let savedLinkTargets = [];

  function stripBlankTargets() {
    savedLinkTargets = [];
    document.querySelectorAll(`#${PAGE_ID} a[target="_blank"]`).forEach((anchor) => {
      savedLinkTargets.push({
        el: anchor,
        target: anchor.getAttribute("target"),
        rel: anchor.getAttribute("rel"),
      });
      anchor.removeAttribute("target");
      anchor.removeAttribute("rel");
    });
  }

  function restoreBlankTargets() {
    savedLinkTargets.forEach(({ el, target, rel }) => {
      if (target) el.setAttribute("target", target);
      else el.removeAttribute("target");
      if (rel) el.setAttribute("rel", rel);
      else el.removeAttribute("rel");
    });
    savedLinkTargets = [];
  }

  function clearPageScale() {
    const page = document.getElementById(PAGE_ID);
    if (!page) return;
    page.classList.remove("is-scaled");
    page.style.removeProperty("--page-scale");
  }

  function resetPageScale() {
    clearPageScale();
    restoreBlankTargets();
  }

  function mmToPx(mm) {
    return (mm / 25.4) * 96;
  }

  function measurePosterHeight(page) {
    document.body.classList.add("is-print-prep");
    page.classList.add("is-print-prep");

    const savedMinHeight = page.style.minHeight;
    page.style.minHeight = "auto";
    void page.offsetHeight;
    const contentHeight = page.scrollHeight;
    page.style.minHeight = savedMinHeight;

    page.classList.remove("is-print-prep");
    document.body.classList.remove("is-print-prep");

    return contentHeight;
  }

  function fitToPage() {
    const page = document.getElementById(PAGE_ID);
    if (!page) return;

    clearPageScale();

    const contentHeight = measurePosterHeight(page);
    const maxPx = mmToPx(PAGE_HEIGHT_MM);

    if (contentHeight > maxPx) {
      const scale = maxPx / contentHeight;
      page.classList.add("is-scaled");
      page.style.setProperty("--page-scale", String(scale));
    }
  }

  function ensureImagesLoaded() {
    const images = document.querySelectorAll(`#${PAGE_ID} img`);
    return Promise.all(
      Array.from(images).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      })
    );
  }

  async function preparePrint() {
    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.add("is-visible");
    });
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await ensureImagesLoaded();
    stripBlankTargets();
    fitToPage();
  }

  window.__expoPrint = {
    preparePrint,
    resetPageScale,
  };

  window.addEventListener("beforeprint", () => {
    preparePrint();
  });

  window.addEventListener("afterprint", resetPageScale);

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initScreenScale();
  });
})();
