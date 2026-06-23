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

  /* Auto-scale for single-page PDF if content overflows */
  function fitToPage() {
    const page = document.getElementById("onePager");
    if (!page) return;

    const pageHeightMm = 297;
    const paddingMm = 16;
    const maxPx = ((pageHeightMm - paddingMm) / 25.4) * 96;

    page.style.transform = "none";
    page.style.width = "";

    const contentHeight = page.scrollHeight;
    if (contentHeight > maxPx) {
      const scale = maxPx / contentHeight;
      page.style.transform = `scale(${scale})`;
      page.style.transformOrigin = "top center";
      page.style.width = `${100 / scale}%`;
    }
  }

  function resetPageScale() {
    const page = document.getElementById("onePager");
    if (!page) return;
    page.style.transform = "none";
    page.style.width = "";
  }

  /* PDF export via print dialog */
  function initExport() {
    const btn = document.getElementById("exportPdf");
    if (!btn) return;

    btn.addEventListener("click", () => {
      fitToPage();
      window.print();
    });

    window.addEventListener("afterprint", resetPageScale);
  }

  /* Show all reveals immediately before print */
  window.addEventListener("beforeprint", () => {
    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.add("is-visible");
    });
    fitToPage();
  });

  window.addEventListener("afterprint", resetPageScale);

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initExport();
  });
})();
