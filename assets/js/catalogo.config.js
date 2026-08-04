// Configuración del catálogo IntiCusco — compartida por index.html y servicios.html.
// Los precios y categorías reales viven en scripts/generar-productos.js (fuente de
// verdad para el generador). Este archivo solo configura el COMPORTAMIENTO del
// catálogo en el navegador: WhatsApp, paginación y agrupación de tendencias.
"use strict";

const WHATSAPP_NUMBER = "51993242555";
const SITE_URL = "https://inticusco.lat/";

// Carpetas marcadas como Tendencias — debe reflejar TRENDING_FOLDERS de
// scripts/generar-productos.js. Se usa aquí solo como referencia para mostrar
// mensajes ("Lo que está marcando estilo") y no para recalcular nada: el campo
// `trending` de cada producto ya viene calculado en productos.generated.js.
const TRENDING_FOLDERS = {
  "Caminera": { trending: true, priority: 100, bestSeller: true },
  "Urbanas": { trending: true, priority: 95 },
  "Vintage o Prelavadas": { trending: true, priority: 90 },
  "Gorras prelavadas Clasicas": { trending: true, priority: 85 },
  "Gorras KepyPolo": { trending: true, priority: 80 },
  "Gorra rusa mujer": { trending: true, priority: 75 },
  "Sombreros modelo koreano en tela DRILL gruesa de una sola cara": { trending: true, priority: 70 },
  "Sombreros en teal drill doble cara": { trending: true, priority: 65 },
  "Sombreros con tela drill con encaje": { trending: true, priority: 60 }
};

const CATALOG_CONFIG = {
  whatsappNumber: WHATSAPP_NUMBER,
  siteUrl: SITE_URL,
  pageSizeIndex: 8,       // productos por sección destacada en index.html
  pageSizeInitial: 12,    // productos iniciales al abrir servicios.html
  pageSizeLoadMore: 12,   // productos que suma cada clic en "Cargar más"
  maxTrendingIndex: 8,
  maxTrendingCatalog: 18
};

if (typeof window !== "undefined") {
  window.CATALOG_CONFIG = CATALOG_CONFIG;
  window.TRENDING_FOLDERS = TRENDING_FOLDERS;
}
