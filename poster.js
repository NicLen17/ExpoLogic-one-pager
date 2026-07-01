(function () {
  "use strict";

  const PAGE_ID = "poster";
  const PAGE_WIDTH_MM = 800;
  const PAGE_HEIGHT_MM = 1100;
  const SCALE_SAFETY = 0.985;

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
    page.style.removeProperty("zoom");
    page.style.removeProperty("width");
  }

  let printPrepToken = 0;

  function clearPrintPrepState() {
    const page = document.getElementById(PAGE_ID);
    clearPageScale();
    if (page) {
      page.style.removeProperty("height");
      page.style.removeProperty("min-height");
    }
    document.documentElement.classList.remove("is-print-prep");
    document.body.classList.remove("is-print-prep");
    page?.classList.remove("is-print-prep");
  }

  function resetPageScale() {
    printPrepToken += 1;
    restoreBlankTargets();
    clearPrintPrepState();
  }

  function mmToPx(mm) {
    return (mm / 25.4) * 96;
  }

  function waitForLayout() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  async function measurePosterHeight(page) {
    document.documentElement.classList.add("is-print-prep");
    document.body.classList.add("is-print-prep");
    page.classList.add("is-print-prep");

    page.style.removeProperty("height");
    page.style.removeProperty("min-height");
    page.style.removeProperty("zoom");
    page.style.removeProperty("width");

    await waitForLayout();

    const style = getComputedStyle(page);
    const gap = parseFloat(style.rowGap) || 0;
    const children = [...page.children];
    let childrenSum = 0;
    children.forEach((child, index) => {
      childrenSum += child.getBoundingClientRect().height;
      if (index > 0) childrenSum += gap;
    });

    const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    return Math.max(page.scrollHeight, childrenSum + paddingY);
  }

  function applyPageScale(page, scale) {
    page.classList.add("is-scaled");
    page.style.setProperty("--page-scale", String(scale));
    page.style.setProperty("zoom", String(scale), "important");
    page.style.setProperty("width", `calc(${PAGE_WIDTH_MM}mm / ${scale})`, "important");
  }

  async function fitToPage() {
    const page = document.getElementById(PAGE_ID);
    if (!page) return;

    clearPageScale();

    const contentHeight = await measurePosterHeight(page);
    const maxPx = mmToPx(PAGE_HEIGHT_MM);

    /* Solo ajusta escala para que el contenido ocupe ~98,5 % de la hoja (reduce o amplía). */
    const TARGET_FILL = 0.985;
    const MAX_SCALE = 2.5;
    const rawScale = (maxPx * TARGET_FILL) / contentHeight;
    const scale = Math.min(MAX_SCALE, rawScale * SCALE_SAFETY);
    applyPageScale(page, scale);
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
    const token = ++printPrepToken;
    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.add("is-visible");
    });
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await ensureImagesLoaded();
    if (token !== printPrepToken) {
      clearPrintPrepState();
      return;
    }
    stripBlankTargets();
    await fitToPage();
    if (token !== printPrepToken) {
      clearPrintPrepState();
      return;
    }
    /* Mantener prep activo hasta afterprint — alinea medición con export. */
    document.documentElement.classList.add("is-print-prep");
    document.body.classList.add("is-print-prep");
    document.getElementById(PAGE_ID)?.classList.add("is-print-prep");
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
