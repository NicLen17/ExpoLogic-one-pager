(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Scroll reveal */
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
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach((el) => observer.observe(el));
  }

  let savedLinkTargets = [];

  function stripBlankTargets() {
    savedLinkTargets = [];
    document.querySelectorAll('#onePager a[target="_blank"]').forEach((anchor) => {
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
    const page = document.getElementById("onePager");
    if (!page) return;
    page.classList.remove("is-scaled");
    page.style.removeProperty("--page-scale");
  }

  function resetPageScale() {
    clearPageScale();
    restoreBlankTargets();
  }

  /* Scale to fit one A4 page — print uses zoom (not transform) so PDF links stay aligned */
  function fitToPage() {
    const page = document.getElementById("onePager");
    if (!page) return;

    clearPageScale();

    const pageHeightMm = 297;
    const paddingMm = 16;
    const maxPx = ((pageHeightMm - paddingMm) / 25.4) * 96;

    const contentHeight = page.scrollHeight;
    if (contentHeight > maxPx) {
      const scale = maxPx / contentHeight;
      page.classList.add("is-scaled");
      page.style.setProperty("--page-scale", String(scale));
    }
  }

  function ensureImagesLoaded() {
    const images = document.querySelectorAll("#onePager img");
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
    await ensureImagesLoaded();
    stripBlankTargets();
    fitToPage();
  }

  /* PDF export via print dialog */
  function initExport() {
    const btn = document.getElementById("exportPdf");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      await preparePrint();
      window.print();
    });

    window.addEventListener("afterprint", resetPageScale);
  }

  window.addEventListener("beforeprint", () => {
    preparePrint();
  });

  window.addEventListener("afterprint", resetPageScale);

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initExport();
  });
})();
