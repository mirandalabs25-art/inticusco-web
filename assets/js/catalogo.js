// IntiCusco — motor del catálogo: tarjetas, filtros, buscador flexible,
// paginación, modal de producto y enlaces de WhatsApp individuales por producto.
// Depende de: assets/js/productos.generated.js (window.INTICUSCO_PRODUCTS)
//             assets/js/catalogo.config.js (window.CATALOG_CONFIG, window.ALIAS_GROUPS)
"use strict";

(function () {
  const PRODUCTS = Array.isArray(window.INTICUSCO_PRODUCTS) ? window.INTICUSCO_PRODUCTS : [];
  const CONFIG = window.CATALOG_CONFIG || { whatsappNumber: "51993242555", siteUrl: window.location.origin + "/" };

  // -----------------------------------------------------------------------
  // Utilidades de WhatsApp por producto
  // -----------------------------------------------------------------------
  function createProductUrl(product) {
    const url = new URL("servicios.html", window.location.href);
    url.hash = product.slug;
    return url.href;
  }

  function createWhatsAppMessage(product) {
    const productUrl = createProductUrl(product);
    const tipoEstilo = product.style || product.type || "Consulta el modelo";

    if (product.pricePending) {
      return `Hola, vi este modelo en la página de IntiCusco:

Producto: ${product.title}
Categoría: ${product.category}
Tipo o estilo: ${tipoEstilo}
Color: ${product.color || "Consulta los colores disponibles"}
Precio: Consultar
Descripción: ${product.description}
Enlace: ${productUrl}

¿Está disponible y cuál es su precio?`;
    }

    return `Hola, vi este modelo en la página de IntiCusco:

Producto: ${product.title}
Categoría: ${product.category}
Tipo o estilo: ${tipoEstilo}
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
  // Helpers de texto
  // -----------------------------------------------------------------------
  function slugify(value) {
    return String(value || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Debe reflejar normalizeSearchText() de scripts/generar-productos.js.
  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  window.IntiCatalog.normalizeSearchText = normalizeSearchText;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Distancia de edición (Levenshtein) — solo se usa para palabras de 5+
  // caracteres, para tolerar errores pequeños ("truker" por "trucker").
  function editDistance(a, b) {
    if (a === b) return 0;
    const al = a.length, bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    if (Math.abs(al - bl) > 2) return 99; // corte rápido, no interesa
    let prev = new Array(bl + 1);
    let curr = new Array(bl + 1);
    for (let j = 0; j <= bl; j++) prev[j] = j;
    for (let i = 1; i <= al; i++) {
      curr[0] = i;
      for (let j = 1; j <= bl; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      [prev, curr] = [curr, prev];
    }
    return prev[bl];
  }

  function byPriority(a, b) {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.title.localeCompare(b.title, "es");
  }
  window.IntiCatalog.byPriority = byPriority;

  // -----------------------------------------------------------------------
  // Buscador flexible (alias, coincidencia parcial, difusa, ranking)
  // -----------------------------------------------------------------------
  // Cada palabra de la búsqueda se compara contra el searchText precalculado
  // de cada producto (ya incluye título, descripción, categoría, tipo,
  // estilo, marca, colores, carpeta y alias). No hace falta volver a
  // normalizar el catálogo completo en cada tecla: solo se normaliza la
  // consulta del usuario.
  function searchScore(product, queryWords) {
    if (!queryWords.length) return 0;
    const text = product.searchText || "";
    let score = 0;
    let matchedWords = 0;

    for (const word of queryWords) {
      if (!word) continue;
      let wordScore = 0;

      if (text === word) wordScore = 5;
      else if (new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\w*").test(text)) wordScore = 4; // coincide al inicio de una palabra
      else if (text.includes(word)) wordScore = 3; // coincidencia parcial en cualquier posición
      else if (word.length >= 5) {
        // Coincidencia difusa: acepta distancia de edición 1 contra las
        // palabras del texto de búsqueda de longitud similar.
        const textWords = text.split(" ");
        for (const tw of textWords) {
          if (Math.abs(tw.length - word.length) > 1) continue;
          if (editDistance(word, tw) <= 1) { wordScore = 2; break; }
        }
      }

      if (wordScore > 0) { matchedWords++; score += wordScore; }
    }

    // Prioriza productos que coinciden con más términos de la búsqueda.
    score += matchedWords * 10;
    return matchedWords > 0 ? score : 0;
  }

  // Devuelve los productos que coinciden con la consulta, ordenados por
  // relevancia (más términos coincidentes primero, luego mejor calidad de
  // coincidencia, luego prioridad/tendencia del producto).
  function searchProducts(query, sourceProducts) {
    const list = sourceProducts || PRODUCTS;
    const normalized = normalizeSearchText(query);
    if (!normalized) return list.slice();

    const queryWords = normalized.split(" ").filter((w) => w.length > 0);
    const scored = [];
    for (const product of list) {
      const score = searchScore(product, queryWords);
      if (score > 0) scored.push({ product, score });
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return byPriority(a.product, b.product);
    });
    return scored.map((s) => s.product);
  }
  window.IntiCatalog.searchProducts = searchProducts;

  // -----------------------------------------------------------------------
  // Tarjeta de producto
  // -----------------------------------------------------------------------
  function priceBlockHtml(product) {
    if (product.pricePending) {
      return `
        <p class="price-pending">Consultar precio</p>`;
    }
    return `
        <div class="price-row">
          <span class="price-regular">S/${product.regularPrice}</span>
          <span class="price-final">S/${product.salePrice}</span>
        </div>
        <p class="price-save">Ahorras S/${product.savings}</p>`;
  }

  function productCardHtml(product) {
    const badges = [];
    if (product.pricePending) badges.push(`<span class="badge badge-pending">Consultar precio</span>`);
    else if (product.discountPercentage > 0) badges.push(`<span class="badge badge-discount">${product.discountPercentage}% DSCTO</span>`);
    if (product.newArrival) badges.push(`<span class="badge badge-new">Nuevo</span>`);
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
          <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy" width="400" height="400" />
        </button>
      </div>
      <div class="product-body">
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <p class="product-desc">${escapeHtml(product.description)}</p>
        <p class="product-color">Color: <strong>${colorText}</strong></p>
        ${priceBlockHtml(product)}
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
      container.innerHTML = `<div class="no-results"><strong>No encontramos coincidencias exactas.</strong>Prueba con el color, estilo, marca o tipo de gorra — o escríbenos por WhatsApp y te ayudamos a encontrar el modelo ideal.</div>`;
      return;
    }
    const fragment = document.createDocumentFragment();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = products.map(productCardHtml).join("");
    while (wrapper.firstElementChild) fragment.appendChild(wrapper.firstElementChild);
    container.innerHTML = "";
    container.appendChild(fragment);

    // Delegación de eventos: un solo listener por contenedor, no uno por tarjeta.
    if (!container.dataset.modalBound) {
      container.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-open-modal]");
        if (!btn || !container.contains(btn)) return;
        const product = PRODUCTS.find((p) => p.slug === btn.getAttribute("data-open-modal"));
        if (product) openModal(product, btn);
      });
      container.dataset.modalBound = "1";
    }
  }
  window.IntiCatalog.renderGrid = renderGrid;

  // -----------------------------------------------------------------------
  // Modal / ficha de producto
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
          <div id="modalPriceBlock"></div>
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
    backdrop.querySelector("#modalWhatsapp").href = createWhatsAppLink(product);

    if (product.pricePending) {
      backdrop.querySelector("#modalPriceBlock").innerHTML = `<p class="price-pending">Consultar precio</p>`;
    } else {
      backdrop.querySelector("#modalPriceBlock").innerHTML = `
        <div class="price-row">
          <span class="price-regular">S/${product.regularPrice}</span>
          <span class="price-final">S/${product.salePrice}</span>
        </div>
        <p class="price-save">Ahorras S/${product.savings} · ${product.discountPercentage}% de descuento</p>`;
    }

    const badges = [];
    if (product.pricePending) badges.push(`<span class="badge badge-pending">Consultar precio</span>`);
    else if (product.discountPercentage > 0) badges.push(`<span class="badge badge-discount">${product.discountPercentage}% DSCTO</span>`);
    if (product.newArrival) badges.push(`<span class="badge badge-new">Nuevo</span>`);
    if (product.trending) badges.push(`<span class="badge badge-trend">Tendencia</span>`);
    if (product.bestSeller) badges.push(`<span class="badge badge-best">Más vendido</span>`);
    backdrop.querySelector("#modalBadges").innerHTML = badges.join("");

    const meta = [];
    meta.push(`<span>Color: ${product.color ? escapeHtml(product.color) : "Consulta disponibles"}</span>`);
    meta.push(`<span>Categoría: ${escapeHtml(product.category)}</span>`);
    if (product.style) meta.push(`<span>Estilo: ${escapeHtml(product.style)}</span>`);
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
    if (filters.categoria) {
      // Casos especiales: algunos enlaces usan "categoria=" para un recorte
      // más específico que el campo product.category (Sección 19/24).
      if (filters.categoria === "boinas-mujer") {
        if (product.category !== "Boinas" || (product.collections || []).indexOf("Mujeres") === -1) return false;
      } else if (filters.categoria === "urbanas") {
        if (slugify(product.type) !== "gorras-urbanas-unisex") return false;
      } else if (slugify(product.category) !== filters.categoria) {
        return false;
      }
    }
    if (filters.tipo && slugify(product.type) !== filters.tipo && slugify(product.subcategory) !== filters.tipo) return false;
    if (filters.estilo) {
      const styleSlug = slugify(product.style || "");
      const brandSlug = slugify(product.brandStyle || "");
      if (styleSlug !== filters.estilo && brandSlug !== filters.estilo) return false;
    }
    if (filters.publico) {
      const has = (product.collections || []).some((c) => slugify(c) === filters.publico);
      if (!has) return false;
    }
    if (filters.coleccion === "tendencias" && !product.trending) return false;
    if (filters.coleccion === "mas-vendidos" && !product.bestSeller) return false;
    if (filters.coleccion === "nuevos" && !product.newArrival) return false;
    if (filters.color && slugify(product.color || "") !== filters.color) return false;
    if (filters.precio && !product.pricePending) {
      const price = product.salePrice;
      if (filters.precio === "0-30" && price > 30) return false;
      if (filters.precio === "31-40" && (price < 31 || price > 40)) return false;
      if (filters.precio === "41-50" && (price < 41 || price > 50)) return false;
    }
    return true;
  }

  window.IntiCatalog.matchesFilters = matchesFilters;
  window.IntiCatalog.slugify = slugify;
  window.IntiCatalog.getParams = getParams;

  document.addEventListener("DOMContentLoaded", () => {
    if (window.location.hash) openFromHash();
  });
})();
