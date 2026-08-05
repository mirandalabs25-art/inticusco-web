// Configuración del catálogo IntiCusco — compartida por index.html y servicios.html.
// Los precios y categorías reales viven en scripts/generar-productos.js (fuente de
// verdad para el generador). Este archivo solo configura el COMPORTAMIENTO del
// catálogo en el navegador: WhatsApp, paginación y grupos de alias del buscador.
"use strict";

const WHATSAPP_NUMBER = "51993242555";
const SITE_URL = "https://inticusco.lat/";

// Debe reflejar ALIAS_GROUPS de scripts/generar-productos.js — si editas uno,
// edita el otro. Se usa aquí solo como referencia de vocabulario del buscador;
// el buscador real compara contra el campo `searchText` ya precalculado de
// cada producto (que ya incluye estos alias).
const ALIAS_GROUPS = {
  "camioneras": ["camionera", "camioneras", "caminera", "camineras", "trucker", "truker", "goorin", "gorin", "goorin bros", "gorra de malla", "gorras de malla"],
  "north-face": ["north face", "northface", "the north face", "north"],
  "patagonia": ["patagonia", "pata", "outdoor"],
  "arabe": ["arabe", "árabe", "estilo arabe", "gorra arabe", "gorras arabes"],
  "boinas-mujer": ["boina", "boinas", "mujer", "boina mujer", "boinas mujer", "paño", "pano"],
  "cristian-daniel": ["cristian", "daniel", "cristian daniel"],
  "polo-original": ["polo original", "original polo", "gorras originales polo", "gorra original"],
  "viseras": ["visera", "viseras", "vicera", "viceras"]
};

// Categorías más vendidas reales — debe reflejar TRENDING_FOLDERS de
// scripts/generar-productos.js. Solo como referencia; `trending`/`priority`
// de cada producto ya vienen calculados en productos.generated.js.
const TRENDING_FOLDERS = {
  "Urbanas": { trending: true, priority: 100, bestSeller: true },
  "Columbia": { trending: true, priority: 95, bestSeller: true },
  "Patagonia": { trending: true, priority: 90, bestSeller: true },
  "Goorin Bros o truker o camioneras": { trending: true, priority: 85, bestSeller: true },
  "Noth Face": { trending: true, priority: 80, bestSeller: true },
  "Boinas de Mujer": { trending: true, priority: 75 },
  "Gorras originales POLO": { trending: true, priority: 70 },
  "Gorras Arabe": { trending: true, priority: 65 },
  "Cristian Daniel": { trending: true, priority: 60 }
};

const CATALOG_CONFIG = {
  whatsappNumber: WHATSAPP_NUMBER,
  siteUrl: SITE_URL,
  pageSizeIndex: 8,       // productos por sección destacada en index.html
  pageSizeInitial: 12,    // productos iniciales al abrir servicios.html
  pageSizeLoadMore: 12,   // productos que suma cada clic en "Cargar más"
  maxTrendingIndex: 8,
  maxTrendingCatalog: 18,
  searchDebounceMs: 250
};

if (typeof window !== "undefined") {
  window.CATALOG_CONFIG = CATALOG_CONFIG;
  window.TRENDING_FOLDERS = TRENDING_FOLDERS;
  window.ALIAS_GROUPS = ALIAS_GROUPS;
}
