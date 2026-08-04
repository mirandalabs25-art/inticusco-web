// IntiCusco — motor del catálogo: tarjetas, filtros, buscador, paginación,
// modal de producto y enlaces de WhatsApp individuales por producto.
// Depende de: assets/js/productos.generated.js (window.INTICUSCO_PRODUCTS)
//             assets/js/catalogo.config.js (window.CATALOG_CONFIG)
"use strict";

(function () {
  const PRODUCTS = Array.isArray(window.INTICUSCO_PRODUCTS) ? window.INTICUSCO_PRODUCTS : [];
  const CONFIG = window.CATALOG_CONFIG || { whatsappNumber: "51993242555", siteUrl: window.location.origin + "/" };

  // -----------------------------------------------------------------------
  // Utilidades de WhatsApp por producto (Sección 26 del brief)
  // -----------------------------------------------------------------------
  function createProductUrl(product) {
    const url = new URL("servicios.html", window.location.href);
    url.hash = product.slug;
    return url.href;
  }

  function createWhatsAppMessage(product) {
    const productUrl = createProductUrl(product);
    return `Hola, vi este modelo en la página de IntiCusco:

Producto: ${product.title}
Color: ${product.color || "Consulta los colores disponibles"}
Precio regular: S/${product.regularPrice}
Descuento web: ${product.discountPercentage}%
Ahorras: S/${product.savings}
Precio web: S/${product.salePrice}
Descripción: ${product.description}
Enlace: ${productUrl}

¿Está disponible?`;
  }

  function createWhatsAppLink(product) {
    return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(createWhatsAppMessage(product))}`;
  }

  window.IntiCatalog = window.IntiCatalog || {};
  window.IntiCatalog.createProductUrl = createProductUrl;
  window.IntiCatalog.createWhatsAppMessage = createWhatsAppMessage;
  window.IntiCatalog.createWhatsAppLink = createWhatsAppLink;
  window.IntiCatalog.products = PRODUCTS;

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  function slugify(value) {
    return String(value)
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function byPriority(a, b) {
    if (b.trendPriority !== a.trendPriority) return b.trendPriority - a.trendPriority;
    return a.title.localeCompare(b.title, "es");
  }

  // -----------------------------------------------------------------------
  // Tarjeta de producto
  // -----------------------------------------------------------------------
  function productCardHtml(product) {
    const badges = [];
    if (product.discountPercentage > 0) badges.push(`<span class="badge badge-discount">${product.discountPercentage}% DSCTO</span>`);
    if (product.trending) badges.push(`<span class="badge badge-trend">Tendencia</span>`);
    if (product.bestSeller) badges.push(`<span class="badge badge-best">Más vendido</span>`);

    const colorText = product.color
      ? escapeHtml(product.color) + (product.secondaryColor ? ` / ${escapeHtml(product.secondaryColor)}` : "")
      : "Consulta los colores disponibles";

    return `
    <article class="product-card" data-slug="${product.slug}">
      <div class="product-media">
        <div class="badges">${badges.join("")}</div>
        <button type="button" class="media-btn" aria-label="Ver detalles de ${escapeHtml(product.title)}" data-open-modal="${product.slug}">
          <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy" />
        </button>
      </div>
      <div class="product-body">
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <p class="product-desc">${escapeHtml(product.description)}</p>
        <p class="product-color">Color: <strong>${colorText}</strong></p>
        <div class="price-row">
          <span class="price-regular">S/${product.regularPrice}</span>
          <span class="price-final">S/${product.salePrice}</span>
        </div>
        <p class="price-save">Ahorras S/${product.savings}</p>
        <div class="product-actions">
          <button type="button" class="btn btn-outline btn-sm" data-open-modal="${product.slug}">Ver detalles</button>
          <a class="btn btn-whatsapp btn-sm" href="${createWhatsAppLink(product)}" target="_blank" rel="noopener">Consultar</a>
        </div>
      </div>
    </article>`;
  }

  function renderGrid(container, products) {
    if (!container) return;
    if (!products.length) {
      container.innerHTML = `<div class="no-results"><strong>No encontramos modelos con esos filtros</strong>Prueba quitando algún filtro o escríbenos por WhatsApp y te ayudamos a encontrar el modelo ideal.</div>`;
      return;
    }
    container.innerHTML = products.map(productCardHtml).join("");
    container.querySelectorAll("[data-open-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const product = PRODUCTS.find((p) => p.slug === btn.getAttribute("data-open-modal"));
        if (product) openModal(product, btn);
      });
    });
  }
  window.IntiCatalog.renderGrid = renderGrid;

  // -----------------------------------------------------------------------
  // Modal / ficha de producto (Sección 27)
  // -----------------------------------------------------------------------
  let modalLastFocused = null;

  function ensureModal() {
    let backdrop = document.getElementById("productModalBackdrop");
    if (backdrop) return backdrop;

    backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "productModalBackdrop";
    backdrop.innerHTML = `
      <div class="product-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button type="button" class="modal-close" id="modalCloseBtn" aria-label="Cerrar">&times;</button>
        <div class="modal-media"><img id="modalImage" src="" alt="" /></div>
        <div class="modal-body">
          <div class="badges" id="modalBadges"></div>
          <h2 id="modalTitle"></h2>
          <p id="modalDesc" class="product-desc" style="-webkit-line-clamp:unset;"></p>
          <div class="modal-meta" id="modalMeta"></div>
          <div class="price-row">
            <span class="price-regular" id="modalRegular"></span>
            <span class="price-final" id="modalFinal"></span>
          </div>
          <p class="price-save" id="modalSave"></p>
          <div class="modal-actions">
            <a class="btn btn-whatsapp" id="modalWhatsapp" href="#" target="_blank" rel="noopener">Consultar este modelo por WhatsApp</a>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
    backdrop.querySelector("#modalCloseBtn").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && backdrop.classList.contains("open")) closeModal();
      if (e.key === "Tab" && backdrop.classList.contains("open")) trapFocus(e, backdrop);
    });
    return backdrop;
  }

  function trapFocus(e, container) {
    const focusable = container.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openModal(product, triggerEl) {
    const backdrop = ensureModal();
    modalLastFocused = triggerEl || document.activeElement;

    backdrop.querySelector("#modalImage").src = product.image;
    backdrop.querySelector("#modalImage").alt = product.title;
    backdrop.querySelector("#modalTitle").textContent = product.title;
    backdrop.querySelector("#modalDesc").textContent = product.description;
    backdrop.querySelector("#modalRegular").textContent = `S/${product.regularPrice}`;
    backdrop.querySelector("#modalFinal").textContent = `S/${product.salePrice}`;
    backdrop.querySelector("#modalSave").textContent = `Ahorras S/${product.savings} · ${product.discountPercentage}% de descuento`;
    backdrop.querySelector("#modalWhatsapp").href = createWhatsAppLink(product);

    const badges = [];
    if (product.discountPercentage > 0) badges.push(`<span class="badge badge-discount">${product.discountPercentage}% DSCTO</span>`);
    if (product.trending) badges.push(`<span class="badge badge-trend">Tendencia</span>`);
    if (product.bestSeller) badges.push(`<span class="badge badge-best">Más vendido</span>`);
    backdrop.querySelector("#modalBadges").innerHTML = badges.join("");

    const meta = [];
    meta.push(`<span>Color: ${product.color ? escapeHtml(product.color) : "Consulta disponibles"}</span>`);
    meta.push(`<span>Categoría: ${escapeHtml(product.category)}</span>`);
    if (product.collections && product.collections.length) meta.push(`<span>Para: ${escapeHtml(product.collections.join(", "))}</span>`);
    meta.push(`<span>${product.available ? "Disponible" : "Consultar disponibilidad"}</span>`);
    backdrop.querySelector("#modalMeta").innerHTML = meta.join("");

    backdrop.classList.add("open");
    window.INTICUSCO_lockScroll && window.INTICUSCO_lockScroll(true);
    backdrop.querySelector("#modalCloseBtn").focus();

    if (history.replaceState) history.replaceState(null, "", "#" + product.slug);
  }

  function closeModal() {
    const backdrop = document.getElementById("productModalBackdrop");
    if (!backdrop) return;
    backdrop.classList.remove("open");
    window.INTICUSCO_lockScroll && window.INTICUSCO_lockScroll(false);
    if (modalLastFocused) modalLastFocused.focus();
  }

  window.IntiCatalog.openModal = openModal;
  window.IntiCatalog.closeModal = closeModal;

  // Abrir directo si la URL trae #slug-del-producto
  function openFromHash() {
    const slug = window.location.hash.replace("#", "");
    if (!slug) return;
    const product = PRODUCTS.find((p) => p.slug === slug);
    if (product) openModal(product, null);
  }
  window.IntiCatalog.openFromHash = openFromHash;

  // -----------------------------------------------------------------------
  // Filtros (usados por servicios.html)
  // -----------------------------------------------------------------------
  function getParams() {
    return new URLSearchParams(window.location.search);
  }

  function matchesFilters(product, filters) {
    if (filters.categoria && slugify(product.category) !== filters.categoria) return false;
    if (filters.tipo && slugify(product.type) !== filters.tipo && slugify(product.subcategory) !== filters.tipo) return false;
    if (filters.estilo && slugify(product.style || "") !== filters.estilo) return false;
    if (filters.publico) {
      const has = (product.collections || []).some((c) => slugify(c) === filters.publico);
      if (!has) return false;
    }
    if (filters.coleccion === "tendencias" && !product.trending) return false;
    if (filters.coleccion === "mas-vendidos" && !product.bestSeller) return false;
    if (filters.color && slugify(product.color || "") !== filters.color) return false;
    if (filters.precio) {
      const price = product.salePrice;
      if (filters.precio === "0-30" && price > 30) return false;
      if (filters.precio === "31-40" && (price < 31 || price > 40)) return false;
      if (filters.precio === "41-50" && (price < 41 || price > 50)) return false;
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const haystack = `${product.title} ${product.description} ${product.category} ${product.style || ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }

  window.IntiCatalog.matchesFilters = matchesFilters;
  window.IntiCatalog.slugify = slugify;
  window.IntiCatalog.getParams = getParams;

  // Abrir modal automáticamente si hay hash al cargar
  document.addEventListener("DOMContentLoaded", () => {
    if (window.location.hash) openFromHash();
  });
})();
