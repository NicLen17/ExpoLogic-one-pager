(function () {
  "use strict";

  const DOCS = {
    "one-pager": { url: "index.html" },
    poster: { url: "poster.html" },
  };

  function getCurrentDoc() {
    if (document.getElementById("onePager")) return "one-pager";
    if (document.getElementById("poster")) return "poster";
    return null;
  }

  function printWindow(win) {
    return new Promise((resolve) => {
      win.addEventListener("afterprint", resolve, { once: true });
      win.print();
    });
  }

  async function waitForIframePrintApi(iframe) {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const api = iframe.contentWindow?.__expoPrint;
      if (api?.preparePrint) return api;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("No se pudo preparar el documento para imprimir.");
  }

  const PRINT_FRAME_SIZES = {
    "one-pager": { width: "210mm", height: "297mm" },
    poster: { width: "800mm", height: "1100mm" },
  };

  function getPrintFrameSize(url) {
    if (url.includes("poster")) return PRINT_FRAME_SIZES.poster;
    return PRINT_FRAME_SIZES["one-pager"];
  }

  async function printRemote(url) {
    const frameSize = getPrintFrameSize(url);
    const iframe = document.createElement("iframe");
    iframe.className = "print-iframe";
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.style.width = frameSize.width;
    iframe.style.height = frameSize.height;
    document.body.appendChild(iframe);

    try {
      await new Promise((resolve, reject) => {
        iframe.addEventListener("load", resolve, { once: true });
        iframe.addEventListener("error", reject, { once: true });
        iframe.src = url;
      });

      const api = await waitForIframePrintApi(iframe);
      await api.preparePrint();
      await printWindow(iframe.contentWindow);
      api.resetPageScale?.();
    } finally {
      iframe.remove();
    }
  }

  async function printLocal() {
    const api = window.__expoPrint;
    if (!api?.preparePrint) throw new Error("Print API no disponible.");
    await api.preparePrint();
    await printWindow(window);
    api.resetPageScale?.();
  }

  async function exportDocuments(target) {
    const current = getCurrentDoc();
    const queue = target === "both" ? ["one-pager", "poster"] : [target];

    for (const doc of queue) {
      if (doc === current) {
        await printLocal();
      } else {
        await printRemote(DOCS[doc].url);
      }
    }
  }

  function initExportModal() {
    const modal = document.getElementById("exportModal");
    const openBtn = document.getElementById("openExportModal");
    const confirmBtn = document.getElementById("confirmExport");
    if (!modal || !openBtn || !confirmBtn) return;

    const current = getCurrentDoc();
    const radios = modal.querySelectorAll('input[name="exportTarget"]');
    const backdrop = modal.querySelector(".export-modal__backdrop");

    function openModal() {
      radios.forEach((radio) => {
        radio.checked = radio.value === current;
      });
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("export-modal-open");
      const checked = modal.querySelector('input[name="exportTarget"]:checked');
      (checked || confirmBtn).focus();
    }

    function closeModal() {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("export-modal-open");
      openBtn.focus();
    }

    openBtn.addEventListener("click", openModal);

    modal.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.addEventListener("click", closeModal);
    });

    backdrop?.addEventListener("click", closeModal);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) closeModal();
    });

    confirmBtn.addEventListener("click", async () => {
      const selected = modal.querySelector('input[name="exportTarget"]:checked')?.value;
      if (!selected) return;

      closeModal();
      openBtn.disabled = true;
      confirmBtn.disabled = true;

      try {
        await exportDocuments(selected);
      } catch (error) {
        console.error(error);
        window.alert("No se pudo exportar. Intentá de nuevo.");
      } finally {
        openBtn.disabled = false;
        confirmBtn.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initExportModal);
})();
