// IntiCusco — comportamiento compartido del sitio: menú de escritorio (mega menú),
// menú móvil en acordeón, y utilidades comunes. Se carga en las 4 páginas.
"use strict";

(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    initMegaMenu();
    initMobileNav();
    initWhatsAppFab();
  });

  // ---------------------------------------------------------------------
  // Mega menú de escritorio (Gorras / Colecciones / Sombreros y más)
  // ---------------------------------------------------------------------
  function initMegaMenu() {
    const items = document.querySelectorAll(".nav-item.has-mega");
    items.forEach((item) => {
      const trigger = item.querySelector(".nav-link");
      const panel = item.querySelector(".mega-panel");
      if (!trigger || !panel) return;

      trigger.setAttribute("aria-expanded", "false");

      function open() {
        items.forEach((other) => closeItem(other));
        trigger.setAttribute("aria-expanded", "true");
        panel.classList.add("open");
      }
      function close() {
        trigger.setAttribute("aria-expanded", "false");
        panel.classList.remove("open");
      }
      function closeItem(otherItem) {
        const t = otherItem.querySelector(".nav-link");
        const p = otherItem.querySelector(".mega-panel");
        if (t) t.setAttribute("aria-expanded", "false");
        if (p) p.classList.remove("open");
      }

      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const isOpen = trigger.getAttribute("aria-expanded") === "true";
        isOpen ? close() : open();
      });
      trigger.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { close(); trigger.blur(); }
      });
      item.addEventListener("mouseleave", close);
    });

    document.addEventListener("click", (e) => {
      items.forEach((item) => {
        if (!item.contains(e.target)) {
          const t = item.querySelector(".nav-link");
          const p = item.querySelector(".mega-panel");
          if (t) t.setAttribute("aria-expanded", "false");
          if (p) p.classList.remove("open");
        }
      });
    });
  }

  // ---------------------------------------------------------------------
  // Menú móvil (acordeón, bloqueo de scroll, cierre con click afuera / Escape)
  // ---------------------------------------------------------------------
  function initMobileNav() {
    const toggle = document.getElementById("menuToggle");
    const nav = document.getElementById("mobileNav");
    const backdrop = document.getElementById("mobileNavBackdrop");
    const closeBtn = document.getElementById("mobileNavClose");
    if (!toggle || !nav || !backdrop) return;

    let lastFocused = null;

    function openNav() {
      lastFocused = document.activeElement;
      nav.classList.add("open");
      backdrop.classList.add("open");
      document.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
      const firstLink = nav.querySelector("a, button");
      if (firstLink) firstLink.focus();
    }
    function closeNav() {
      nav.classList.remove("open");
      backdrop.classList.remove("open");
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      nav.querySelectorAll(".accordion-panel.open").forEach((p) => p.classList.remove("open"));
      nav.querySelectorAll('.accordion-trigger[aria-expanded="true"]').forEach((t) => t.setAttribute("aria-expanded", "false"));
      if (lastFocused) lastFocused.focus();
    }

    toggle.addEventListener("click", () => {
      nav.classList.contains("open") ? closeNav() : openNav();
    });
    if (closeBtn) closeBtn.addEventListener("click", closeNav);
    backdrop.addEventListener("click", closeNav);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) closeNav();
    });
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));

    // Acordeones internos del menú móvil
    nav.querySelectorAll(".accordion-trigger").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", () => {
        const panel = document.getElementById(trigger.getAttribute("aria-controls"));
        const isOpen = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!isOpen));
        if (panel) panel.classList.toggle("open", !isOpen);
      });
    });

    // Trampa de foco simple mientras el menú está abierto
    nav.addEventListener("keydown", (e) => {
      if (e.key !== "Tab" || !nav.classList.contains("open")) return;
      const focusable = nav.querySelectorAll('a, button, input, select, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  // ---------------------------------------------------------------------
  // Botón flotante de WhatsApp (mensaje general, no ligado a un producto)
  // ---------------------------------------------------------------------
  function initWhatsAppFab() {
    const fab = document.querySelector(".whatsapp-fab");
    if (!fab || !window.CATALOG_CONFIG) return;
    const message = "Hola, vi la página de IntiCusco y quisiera recibir más información.";
    fab.href = `https://wa.me/${window.CATALOG_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  // Utilidad compartida: bloquear/desbloquear scroll del body (usada por el modal de producto)
  window.INTICUSCO_lockScroll = function (locked) {
    document.body.classList.toggle("nav-open", locked);
  };
})();
