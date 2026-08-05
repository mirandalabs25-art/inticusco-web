#!/usr/bin/env node
"use strict";

/**
 * Generador de catálogo IntiCusco — Versión 2.
 * Lee la carpeta Gorras/ (organizada manualmente por el negocio: cada subcarpeta
 * es una categoría/estilo, cada foto ya tiene un nombre descriptivo) y genera
 * assets/js/productos.generated.js con un array de productos listo para el sitio.
 *
 * No analiza imágenes visualmente. No usa OCR. Toda la información sale del
 * nombre de carpeta + nombre de archivo + este mapa de configuración.
 *
 * Uso: npm run generar-productos   (equivale a: node scripts/generar-productos.js)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const GORRAS_DIR = path.join(ROOT, "Gorras");
const OUTPUT_DIR = path.join(ROOT, "assets", "js");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "productos.generated.js");

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".jfif"]);

// Patrones de archivos/carpetas a ignorar siempre, en cualquier nivel (Sección 5/13/37).
const IGNORE_NAME_PATTERNS = [
  /whatsapp business/i,
  /^_rename-log\.txt$/i,
  /^thumbs\.db$/i,
  /^\.ds_store$/i,
  /\.enc$/i,
  /\.descarga$/i,
  /^\./ // archivos/carpetas ocultas (empiezan con punto)
];

function isIgnoredName(name) {
  return IGNORE_NAME_PATTERNS.some((re) => re.test(name));
}

// ---------------------------------------------------------------------------
// 1. Mapa de carpetas -> categoría / precio / colecciones / estilo / marca
//    Las claves son los nombres REALES de carpeta en disco (pueden tener
//    errores de tipeo — no se renombran las carpetas físicas, sección 7).
// ---------------------------------------------------------------------------

const FOLDER_CONFIG = {
  "Bandanas": {
    titleBase: "Bandana", normalizedFolder: "Bandanas",
    category: "Bandanas", subcategory: "Accesorios", type: "Bandanas",
    price: 10, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Bataclavas o pasamontañas": {
    titleBase: "Pasamontañas", normalizedFolder: "Balaclavas y pasamontañas",
    category: "Balaclavas o pasamontañas", subcategory: "Accesorios", type: "Balaclavas",
    price: 25, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Big spin": {
    titleBase: "Gorra estilo Big Spin", normalizedFolder: "Big Spin",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Big Spin", brandStyle: "Big Spin", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Bigyou": {
    titleBase: "Gorra estilo Big You", normalizedFolder: "Big You",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Big You", brandStyle: "Big You", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Boinas de Mujer": {
    titleBase: "Boina para mujer", normalizedFolder: "Boinas para mujer",
    category: "Boinas", subcategory: "Mujeres", type: "Boinas para mujer",
    price: 45, collections: ["Mujeres"], aliasGroup: "boinas-mujer"
  },
  "Boinas en tela y paño": {
    titleBase: "Boina", normalizedFolder: "Boinas",
    category: "Boinas", subcategory: "Boinas", type: "Boinas",
    priceRule: "boina", collections: ["Adultos", "Mujeres"]
  },
  "Calvin Klein": {
    titleBase: "Gorra estilo Calvin Klein", normalizedFolder: "Calvin Klein",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Calvin Klein", brandStyle: "Calvin Klein", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Chullos": {
    titleBase: "Chullo", normalizedFolder: "Chullos",
    category: "Chullos", subcategory: "Abrigo", type: "Chullos",
    priceRule: "chullo", collections: ["Adultos", "Familias"]
  },
  "Chullos en Hilo": {
    titleBase: "Chullo tejido en hilo", normalizedFolder: "Chullos tejidos en hilo",
    category: "Chullos", subcategory: "Abrigo", type: "Chullos tejidos en hilo",
    priceRule: "chullo", collections: ["Adultos", "Familias"]
  },
  "Columbia": {
    titleBase: "Gorra estilo Columbia", normalizedFolder: "Columbia",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Columbia", brandStyle: "Columbia", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Cristian Daniel": {
    titleBase: "Gorra estilo Cristian Daniel", normalizedFolder: "Cristian Daniel",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Cristian Daniel", brandStyle: "Cristian Daniel", price: 50, collections: ["Adultos", "Jovenes", "Unisex"],
    aliasGroup: "cristian-daniel"
  },
  "En tela DRILL para niño y niña": {
    titleBase: "Gorra infantil en tela drill", normalizedFolder: "Gorras infantiles en tela drill",
    category: "Gorras", subcategory: "Infantiles", type: "Gorras infantiles en tela drill",
    price: 40, collections: ["Niños", "Familias"]
  },
  "Equipo de futbol": {
    titleBase: "Gorra de equipo de fútbol", normalizedFolder: "Equipos de fútbol",
    category: "Gorras", subcategory: "Temáticas", type: "Gorras de equipos de futbol",
    price: 40, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Goorin Bros o truker o camioneras": {
    titleBase: "Gorra camionera estilo Trucker", normalizedFolder: "Gorras camioneras",
    category: "Gorras", subcategory: "Por tipo", type: "Camioneras",
    style: "Trucker", brandStyle: "Goorin Bros.", price: 50, collections: ["Adultos", "Jovenes", "Unisex"],
    aliasGroup: "camioneras"
  },
  "Gorra rusa mujer": {
    titleBase: "Gorra rusa para mujer", normalizedFolder: "Gorra rusa para mujer",
    category: "Gorras", subcategory: "Mujeres", type: "Gorra rusa para mujer",
    price: 40, collections: ["Mujeres"]
  },
  "Gorras Arabe": {
    titleBase: "Gorra estilo árabe", normalizedFolder: "Gorras estilo árabe",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Árabe", price: 50, collections: ["Adultos", "Jovenes", "Unisex"],
    aliasGroup: "arabe"
  },
  "Gorras de Escudo de peru colores": {
    titleBase: "Gorra con escudo del Perú", normalizedFolder: "Gorras con escudo del Perú",
    category: "Gorras", subcategory: "Temáticas", type: "Gorras con escudo del Peru",
    price: 40, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gorras en POLO": {
    titleBase: "Gorra estilo Polo en tela drill", normalizedFolder: "Gorras estilo Polo",
    category: "Gorras", subcategory: "Por tipo", type: "Gorras estilo Polo en tela drill",
    price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gorras KepyPolo": {
    titleBase: "Gorra Kepy Polo en tela drill", normalizedFolder: "Gorras Kepy Polo",
    category: "Gorras", subcategory: "Por tipo", type: "Gorras Kepy Polo en tela drill",
    price: 45, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gorras niños en modelo y animes": {
    titleBase: "Gorra infantil", normalizedFolder: "Gorras para niños y diseños animados",
    category: "Gorras", subcategory: "Infantiles", type: "Gorras infantiles con disenos animados",
    price: 35, collections: ["Niños", "Familias"]
  },
  "Gorras originales POLO": {
    titleBase: "Gorra original Polo", normalizedFolder: "Gorras originales Polo",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Polo original", brandStyle: "Polo", isOriginal: true,
    price: 80, collections: ["Adultos", "Jovenes", "Unisex"], aliasGroup: "polo-original"
  },
  "Gorras prelavadas Clasicas": {
    titleBase: "Gorra clásica prelavada", normalizedFolder: "Gorras prelavadas clásicas",
    category: "Gorras", subcategory: "Por tipo", type: "Gorras prelavadas clasicas",
    price: 30, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gucci": {
    titleBase: "Gorra estilo Gucci", normalizedFolder: "Gucci",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Gucci", brandStyle: "Gucci", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gues": {
    titleBase: "Gorra estilo Guess", normalizedFolder: "Guess",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Guess", brandStyle: "Guess", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Hoja Latina": {
    titleBase: "Gorra Hoja Latina", normalizedFolder: "Hoja Latina",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Hoja Latina", brandStyle: "Hoja Latina", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Hugo": {
    titleBase: "Gorra estilo Hugo", normalizedFolder: "Hugo",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Hugo", brandStyle: "Hugo", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Lacoste": {
    titleBase: "Gorra estilo Lacoste", normalizedFolder: "Lacoste",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Lacoste", brandStyle: "Lacoste", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Michael": {
    titleBase: "Gorra estilo Michael", normalizedFolder: "Michael",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Michael", brandStyle: "Michael", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Noth Face": {
    titleBase: "Gorra estilo North Face", normalizedFolder: "North Face",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "North Face", brandStyle: "North Face", price: 50, collections: ["Adultos", "Jovenes", "Unisex"],
    aliasGroup: "north-face"
  },
  "Patagonia": {
    titleBase: "Gorra estilo Patagonia", normalizedFolder: "Patagonia",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Patagonia", brandStyle: "Patagonia", price: 50, collections: ["Adultos", "Jovenes", "Unisex"],
    aliasGroup: "patagonia"
  },
  "Sombreros bordados en paño": {
    titleBase: "Sombrero bordado en paño", normalizedFolder: "Sombreros bordados en paño",
    category: "Sombreros", subcategory: "Sombreros", type: "Sombreros bordados en pano",
    price: 45, collections: ["Adultos", "Mujeres"]
  },
  "Sombreros con tela drill con encaje": {
    titleBase: "Sombrero modelo coreano con encaje", normalizedFolder: "Sombreros modelo coreano con encaje",
    category: "Sombreros", subcategory: "Sombreros", type: "Sombreros modelo coreano con encaje",
    price: 50, collections: ["Mujeres"]
  },
  "Sombreros en Paño": {
    titleBase: "Sombrero en paño", normalizedFolder: "Sombreros en paño",
    category: "Sombreros", subcategory: "Sombreros", type: "Sombreros en pano",
    price: 45, collections: ["Adultos", "Mujeres"]
  },
  "Sombreros en teal drill doble cara": {
    titleBase: "Sombrero modelo coreano doble cara", normalizedFolder: "Sombreros en tela drill doble cara",
    category: "Sombreros", subcategory: "Sombreros", type: "Sombreros modelo coreano doble cara",
    price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Sombreros impermeables koreanos": {
    titleBase: "Sombrero impermeable modelo coreano", normalizedFolder: "Sombreros impermeables coreanos",
    category: "Sombreros", subcategory: "Sombreros", type: "Sombreros impermeables modelo coreano",
    price: 45, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Sombreros modelo koreano en tela DRILL gruesa de una sola cara": {
    titleBase: "Sombrero modelo coreano en tela drill", normalizedFolder: "Sombreros modelo coreano en tela drill",
    category: "Sombreros", subcategory: "Sombreros", type: "Sombreros modelo coreano en tela drill",
    price: 45, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Sombreros para niñas": {
    titleBase: "Sombrero para niña", normalizedFolder: "Sombreros para niñas",
    category: "Sombreros", subcategory: "Infantiles", type: "Sombreros para ninas",
    price: 35, collections: ["Niños", "Familias"]
  },
  "Urbanas": {
    titleBase: "Gorra urbana", normalizedFolder: "Gorras urbanas",
    category: "Gorras", subcategory: "Por tipo", type: "Gorras urbanas unisex",
    price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Versace": {
    titleBase: "Gorra estilo Versace", normalizedFolder: "Versace",
    category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Versace", brandStyle: "Versace", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Viceras en tela y algodón": {
    titleBase: "Visera", normalizedFolder: "Viseras en tela y algodón",
    category: "Viseras", subcategory: "Viseras", type: "Viseras",
    priceRule: "visera", collections: ["Adultos", "Jovenes", "Unisex"], aliasGroup: "viseras"
  },
  "Vintage o Prelavadas": {
    titleBase: "Gorra vintage o prelavada", normalizedFolder: "Gorras vintage o prelavadas",
    category: "Gorras", subcategory: "Por tipo", type: "Gorras vintage o prelavadas",
    price: 40, collections: ["Adultos", "Jovenes", "Unisex"]
  }
};

// Carpetas incluidas inicialmente en "Nuevos ingresos" (Sección 16).
const NEW_ARRIVAL_FOLDERS = new Set([
  "Cristian Daniel",
  "Gorras Arabe",
  "Gorras originales POLO",
  "Noth Face",
  "Patagonia",
  "Boinas de Mujer",
  "Goorin Bros o truker o camioneras"
]);

// Categorías más vendidas reales (Sección 17) → prioridad para Tendencias /
// Más vendidos / orden de portada. Solo se marcan 1-2 productos "semilla" por
// carpeta, no la carpeta completa.
const TRENDING_FOLDERS = {
  "Urbanas": { priority: 100, seedCount: 2, bestSeller: true },
  "Columbia": { priority: 95, seedCount: 2, bestSeller: true },
  "Patagonia": { priority: 90, seedCount: 2, bestSeller: true },
  "Goorin Bros o truker o camioneras": { priority: 85, seedCount: 2, bestSeller: true },
  "Noth Face": { priority: 80, seedCount: 2, bestSeller: true },
  "Boinas de Mujer": { priority: 75, seedCount: 1 },
  "Gorras originales POLO": { priority: 70, seedCount: 1 },
  "Gorras Arabe": { priority: 65, seedCount: 1 },
  "Cristian Daniel": { priority: 60, seedCount: 1 }
};

// Grupos de alias para el buscador flexible (Sección 28). Se copian tal cual
// en assets/js/catalogo.config.js para que el buscador del navegador use el
// mismo vocabulario — si editas uno, edita el otro.
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

// ---------------------------------------------------------------------------
// 2. Utilidades de texto
// ---------------------------------------------------------------------------

function stripAccents(value) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeForMatch(value) {
  return stripAccents(value).toLowerCase();
}

// Debe reflejar normalizeSearchText() de assets/js/catalogo.js.
function normalizeSearchText(value) {
  return stripAccents(String(value || ""))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COLOR_WORDS = [
  "negro", "negra", "blanco", "blanca", "beige", "beish", "marron", "caffe", "cafe", "camel",
  "azul", "celeste", "rojo", "roja", "verde", "rosado", "rosa", "morado", "morada", "lila",
  "gris", "amarillo", "amarilla", "naranja", "crema", "vino", "guinda", "caqui", "khaki",
  "multicolor", "dorado", "dorada", "plateado", "plateada", "oliva", "fucsia", "turquesa", "plomo"
];

const COLOR_LABELS = {
  marron: "marrón", khaki: "caqui", negra: "negro", blanca: "blanco", amarilla: "amarillo",
  roja: "rojo", morada: "morado", dorada: "dorado", plateada: "plateado",
  beish: "beige", caffe: "marrón", cafe: "marrón", plomo: "gris"
};

// Los colores se detectan en el ORDEN en que aparecen dentro del texto (no en
// el orden de la lista COLOR_WORDS), para que el color principal sea siempre
// el primero que escribió quien nombró la foto, no el primero de la lista.
const COLOR_WORDS_BY_LENGTH = [...COLOR_WORDS].sort((a, b) => b.length - a.length);
const COLOR_REGEX = new RegExp("\\b(" + COLOR_WORDS_BY_LENGTH.join("|") + ")\\b", "gi");

function detectColors(rawName) {
  const norm = normalizeForMatch(rawName);
  const label = (w) => COLOR_LABELS[w] || w;

  const matches = [];
  const seenCanonical = new Set();
  let m;
  COLOR_REGEX.lastIndex = 0;
  while ((m = COLOR_REGEX.exec(norm)) !== null) {
    const word = m[0].toLowerCase();
    const canonical = label(word);
    if (seenCanonical.has(canonical)) continue;
    seenCanonical.add(canonical);
    matches.push({ canonical, index: m.index });
    if (matches.length >= 2) break;
  }

  return {
    color: matches[0] ? matches[0].canonical : null,
    secondaryColor: matches[1] ? matches[1].canonical : null
  };
}

function slugify(value) {
  return stripAccents(String(value || ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const IMAGE_EXT_WORDS = /\.(jpg|jpeg|png|webp|avif|jfif)$/i;

function stripExtension(filename) {
  let result = filename;
  // Algunos archivos quedaron con doble extensión por error (ej. "...golf.png.png").
  // Se retiran todas las extensiones de imagen encontradas al final, no solo la última.
  while (IMAGE_EXT_WORDS.test(result)) {
    result = result.replace(IMAGE_EXT_WORDS, "");
  }
  return result;
}

// Nombres de archivo tipo UUID sin ninguna descripción real (ej. cámaras/apps
// que no renombraron la foto) — se retiran por completo, no aportan información.
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

function stripOrderingNumbers(text) {
  return text
    .replace(/^\s*\(?\d{1,3}\)?[\s.\-]+/, "")
    .replace(/[\s.\-]+\(?\d{1,3}\)?\s*$/, "");
}

// Palabras de autenticidad — nunca se muestran salvo para carpetas con
// isOriginal:true (Sección 10). Se filtran siempre de los nombres de archivo.
const AUTHENTICITY_WORDS = new Set([
  "original", "originales", "autentico", "autentica", "oficial",
  "licencia", "licenciado", "licenciada", "autorizado"
]);

const GENERIC_FILLER_WORDS = new Set([
  "gorra", "gorras", "sombrero", "sombreros", "sombrera", "sombre", "con", "de", "del",
  "la", "el", "los", "las", "logo", "color", "marca", "es", "un", "una", "tiene",
  "lleva", "y", "en", "para", "co", "conta",
  // Alias de marca/carpeta que quedan pegados o mal escritos en los nombres de archivo
  // y que ya están representados en el titleBase, para no repetirlos.
  "bigspin", "bigyu", "bigyou", "kepypolo", "koreano", "colo",
  "trucker", "truker", "camionera", "camioneras", "caminera", "camineras",
  "goorin", "gorin", "bros", "broos", "norht"
]);

function buildDetailPhrase(fileBase, titleBaseWords, allowOriginal) {
  let s = fileBase.replace(UUID_PATTERN, " ");
  s = s.replace(/[_\-]+/g, " ");
  s = stripOrderingNumbers(s);
  // "sin marca" es una etiqueta técnica ("sin-marca-01"), no una descripción real
  // del producto — se retira como frase completa antes de tokenizar.
  s = s.replace(/\bsin\s+marca\b/gi, " ");
  s = s.replace(/[,.:;]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  const stop = new Set(GENERIC_FILLER_WORDS);
  for (const w of titleBaseWords) stop.add(normalizeForMatch(w));
  if (!allowOriginal) {
    for (const w of AUTHENTICITY_WORDS) stop.add(w);
  } else {
    // Incluso en carpetas confirmadas como originales, solo se permite
    // "original"/"originales" — el resto de palabras de autenticidad no
    // confirmadas se siguen retirando (Sección 10).
    for (const w of AUTHENTICITY_WORDS) {
      if (w !== "original" && w !== "originales") stop.add(w);
    }
  }

  const words = s.split(/\s+/).filter(Boolean);
  const kept = [];
  for (const w of words) {
    const norm = normalizeForMatch(w);
    if (stop.has(norm)) continue;
    if (/^\d+$/.test(norm)) continue;
    kept.push(w.toLowerCase());
  }
  const deduped = kept.filter((w, i) => w !== kept[i - 1]);
  return deduped.join(" ").trim();
}

function toTitleCase(sentence) {
  const cleaned = sentence.replace(/\s+/g, " ").trim();
  if (!cleaned) return cleaned;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// ---------------------------------------------------------------------------
// 3. Descripciones estables (deterministas mediante hash del slug)
// ---------------------------------------------------------------------------

function getStableTemplateIndex(value, templatesLength) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % templatesLength;
}

const TEMPLATES = {
  gorras: [
    (p) => `Una ${p.producto} ${p.detalleEn}, fácil de combinar y perfecta para acompañar tus días con un estilo moderno.`,
    (p) => `Este modelo ${p.detalleEn} aporta un toque alegre y urbano para paseos, reuniones y actividades diarias.`,
    (p) => `Un diseño ${p.detalleEn} pensado para complementar diferentes estilos de manera sencilla, alegre y familiar.`,
    (p) => `Dale un toque diferente a tu look con esta ${p.producto} ${p.detalleEn}. Consulta disponibilidad por WhatsApp.`,
    (p) => `Un modelo versátil y combinable ${p.detalleEn}, ideal para jóvenes y adultos que buscan un estilo casual para todos los días.`
  ],
  ninos: [
    (p) => `Un modelo ${p.detalleEn}, alegre y divertido para acompañar a los más pequeños durante sus paseos, juegos y aventuras.`,
    (p) => `Color y diversión ${p.detalleEn} para complementar el estilo de niños y niñas. Consulta disponibilidad de este diseño.`,
    (p) => `Una opción infantil ${p.detalleEn}, llamativa para disfrutar salidas, paseos y momentos especiales en familia.`
  ],
  sombreros: [
    (p) => `Un sombrero ${p.detalleEn} que combina un estilo especial para paseos, reuniones y días al aire libre.`,
    (p) => `Este modelo ${p.detalleEn} aporta un toque cálido y diferente para complementar tus prendas favoritas.`,
    (p) => `Un diseño versátil y agradable ${p.detalleEn} para acompañarte en distintas ocasiones junto a la familia.`
  ],
  accesorios: [
    (p) => `Un accesorio ${p.detalleEn}, alegre y versátil para complementar distintos estilos de grandes y pequeños.`,
    (p) => `Añade un toque de color y personalidad ${p.detalleEn} con este diseño. Consulta disponibilidad por WhatsApp.`,
    (p) => `Un detalle sencillo y combinable ${p.detalleEn} para darle un estilo diferente a tus días.`
  ],
  camioneras: [
    (p) => `Gorra camionera ${p.detalleEn} de estilo Trucker, una alternativa versátil para complementar looks casuales y descubrir nuevos diseños para cada ocasión.`,
    (p) => `Modelo camionero ${p.detalleEn} inspirado en el estilo Trucker, con malla trasera y un diseño urbano fácil de combinar.`,
    (p) => `Una camionera ${p.detalleEn} de diseño urbano, ideal para quienes buscan un estilo Trucker casual y llamativo.`
  ],
  original: [
    (p) => `Un modelo original Polo ${p.detalleEn}, con la garantía de un producto genuino para complementar tu estilo. Consulta disponibilidad por WhatsApp.`,
    (p) => `Gorra original Polo ${p.detalleEn}, una pieza auténtica para quienes buscan calidad confirmada en cada detalle.`,
    (p) => `Modelo original Polo ${p.detalleEn}, ideal para acompañar tus días con la confianza de un producto original.`
  ]
};

const FALLBACK_DESCRIPTION =
  "Un modelo alegre y versátil para complementar diferentes estilos. Escríbenos por WhatsApp para consultar disponibilidad y más detalles.";

function pickTemplateGroup(product, config) {
  if (config.isOriginal) return "original";
  if (config.aliasGroup === "camioneras") return "camioneras";
  if (product.collections.includes("Niños")) return "ninos";
  if (product.category === "Sombreros") return "sombreros";
  if (["Bandanas", "Balaclavas o pasamontañas", "Viseras", "Boinas", "Chullos"].includes(product.category)) return "accesorios";
  return "gorras";
}

function buildDescription(product, productoWord, config) {
  const group = pickTemplateGroup(product, config);
  const templates = TEMPLATES[group];
  const detalleEn = product.color
    ? (product.secondaryColor ? `en ${product.color} y ${product.secondaryColor}` : `en ${product.color}`)
    : "de estilo urbano";

  const idx = getStableTemplateIndex(product.slug, templates.length);
  let text = templates[idx]({ producto: productoWord, detalleEn });

  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/\b(\w+)\s+\1\b/gi, "$1");
  if (!/[.!?]$/.test(text)) text += ".";

  if (text.split(/\s+/).length < 6) return { text: FALLBACK_DESCRIPTION, templateIndex: 0, group: "fallback" };
  return { text, templateIndex: idx, group };
}

// ---------------------------------------------------------------------------
// 4. Precios
// ---------------------------------------------------------------------------

function calculateDiscountPercentage(regularPrice, salePrice) {
  if (!Number.isFinite(regularPrice) || !Number.isFinite(salePrice) || regularPrice <= salePrice) {
    return 0;
  }
  return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
}

function createPriceData(finalPrice) {
  const salePrice = Number(finalPrice);
  const regularPrice = salePrice + 10;
  const savings = regularPrice - salePrice;
  return {
    salePrice,
    regularPrice,
    savings,
    discountPercentage: calculateDiscountPercentage(regularPrice, salePrice),
    promotionActive: true,
    pricePending: false
  };
}

const PRICE_PENDING_DATA = {
  salePrice: null,
  regularPrice: null,
  savings: null,
  discountPercentage: 0,
  promotionActive: false,
  pricePending: true
};

function resolvePrice(config, rawFilename, warnings, folderName) {
  if (typeof config.price === "number") return createPriceData(config.price);

  const norm = normalizeForMatch(rawFilename);

  if (config.priceRule === "boina") {
    if (norm.includes("pano") || norm.includes("paño")) return createPriceData(45);
    if (norm.includes("tela")) return createPriceData(35);
    warnings.push(`No se pudo determinar tela/paño para boina: "${folderName}/${rawFilename}". Se mantuvo la lógica vigente: S/35 por defecto.`);
    return createPriceData(35);
  }

  if (config.priceRule === "chullo") {
    if (norm.includes("sin orejera") || norm.includes("solo chullo")) return createPriceData(40);
    if (norm.includes("orejera")) return createPriceData(50);
    warnings.push(`No se pudo determinar orejera para chullo: "${folderName}/${rawFilename}". Se mantuvo la lógica vigente: S/40 por defecto.`);
    return createPriceData(40);
  }

  if (config.priceRule === "visera") {
    if (norm.includes("algodon")) return createPriceData(30);
    if (norm.includes("tela")) return createPriceData(35);
    warnings.push(`No se pudo determinar algodón/tela para visera: "${folderName}/${rawFilename}". Se mantuvo la lógica vigente: S/30 por defecto.`);
    return createPriceData(30);
  }

  // Carpeta sin precio configurado: no se inventa un precio genérico (Sección 11).
  warnings.push(`Carpeta SIN precio configurado: "${folderName}". Producto marcado como pricePending (Consultar precio).`);
  return { ...PRICE_PENDING_DATA };
}

// ---------------------------------------------------------------------------
// 5. Recorrido recursivo de Gorras/
// ---------------------------------------------------------------------------

function toWebPath(absPath) {
  const rel = path.relative(ROOT, absPath).split(path.sep);
  return rel.map((segment) => encodeURIComponent(segment)).join("/");
}

// Recorre una carpeta de categoría de forma recursiva (por si hay fotos en
// subcarpetas), devolviendo rutas completas de archivos de imagen válidos.
function walkImages(dir, ignoredFiles, folderLabel) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return results;
  }
  for (const entry of entries) {
    if (isIgnoredName(entry.name)) {
      if (entry.isFile()) ignoredFiles.push(`${folderLabel}/${entry.name}`);
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkImages(full, ignoredFiles, `${folderLabel}/${entry.name}`));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) {
        results.push(full);
      } else {
        ignoredFiles.push(`${folderLabel}/${entry.name}`);
      }
    }
  }
  return results;
}

function main() {
  const warnings = [];
  const ignoredFiles = [];
  const unknownFolders = [];
  const products = [];
  const usedSlugs = new Set();
  const usedIds = new Set();

  if (!fs.existsSync(GORRAS_DIR)) {
    console.error(`No se encontró la carpeta Gorras/ en: ${GORRAS_DIR}`);
    process.exit(1);
  }

  const folderNames = fs.readdirSync(GORRAS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => collator.compare(a, b));

  for (const folderName of folderNames) {
    const config = FOLDER_CONFIG[folderName];
    if (!config) {
      unknownFolders.push(folderName);
      continue;
    }

    const folderPath = path.join(GORRAS_DIR, folderName);
    const filePaths = walkImages(folderPath, ignoredFiles, folderName)
      .sort((a, b) => collator.compare(a, b));

    const titleBaseWords = config.titleBase.split(/\s+/);
    const productoWord = normalizeForMatch(config.titleBase.split(/\s+/)[0]);
    const aliasWords = config.aliasGroup ? (ALIAS_GROUPS[config.aliasGroup] || []) : [];
    const isNewArrival = NEW_ARRIVAL_FOLDERS.has(folderName);

    let seedsAssigned = 0;
    const trendConfig = TRENDING_FOLDERS[folderName];

    filePaths.forEach((absPath) => {
      const filename = path.basename(absPath);
      const fileBase = stripExtension(filename);
      const rawForColor = `${folderName} ${fileBase}`;

      const { color, secondaryColor } = detectColors(rawForColor);
      const detail = buildDetailPhrase(fileBase, titleBaseWords, !!config.isOriginal);

      let title = config.titleBase;
      if (detail) title = `${config.titleBase} ${detail}`;
      title = toTitleCase(title);

      let slug = slugify(title);
      if (usedSlugs.has(slug)) {
        let n = 2;
        while (usedSlugs.has(`${slug}-${n}`)) n++;
        slug = `${slug}-${n}`;
      }
      usedSlugs.add(slug);

      let id = slug;
      if (usedIds.has(id)) {
        let n = 2;
        while (usedIds.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      usedIds.add(id);

      const priceData = resolvePrice(config, fileBase, warnings, folderName);

      const category = config.category;
      const subcategory = config.subcategory;
      const type = config.type;
      const style = config.style || null;
      const brandStyle = config.brandStyle || null;
      const collections = config.collections.slice();
      const normalizedFolder = config.normalizedFolder || folderName;

      const tags = Array.from(new Set([
        category, type, style, brandStyle, color, secondaryColor, normalizedFolder,
        ...collections
      ].filter(Boolean).map((t) => String(t))));

      const aliases = Array.from(new Set(aliasWords));

      const product = {
        id,
        slug,
        title,
        category,
        subcategory,
        type,
        style,
        brandStyle,
        isOriginal: !!config.isOriginal,
        collections,
        color,
        secondaryColor,
        ...priceData,
        available: true,
        featured: false,
        bestSeller: false,
        newArrival: isNewArrival,
        trending: false,
        priority: 0,
        fileName: filename,
        folder: folderName,
        normalizedFolder,
        image: toWebPath(absPath),
        originalFile: path.relative(ROOT, absPath).split(path.sep).join("/")
      };

      const desc = buildDescription(product, productoWord, config);
      product.description = desc.text;

      const searchTextParts = [
        title, desc.text, category, subcategory, type, style, brandStyle,
        color, secondaryColor, folderName, normalizedFolder,
        ...tags, ...aliases, ...collections
      ].filter(Boolean);
      product.tags = tags;
      product.aliases = aliases;
      product.searchText = normalizeSearchText(searchTextParts.join(" "));

      if (trendConfig && seedsAssigned < trendConfig.seedCount) {
        product.trending = true;
        product.priority = trendConfig.priority;
        if (trendConfig.bestSeller) product.bestSeller = true;
        product.featured = true;
        seedsAssigned++;
      }

      product._templateGroup = desc.group;
      product._templateIndex = desc.templateIndex;

      products.push(product);
    });
  }

  // Evitar que una misma plantilla de descripción se repita más de 3 veces
  // seguidas dentro del mismo grupo.
  for (const group of Object.keys(TEMPLATES)) {
    let run = 0;
    let lastIndex = null;
    for (const product of products) {
      if (product._templateGroup !== group) { run = 0; lastIndex = null; continue; }
      if (product._templateIndex === lastIndex) {
        run++;
        if (run >= 3) {
          const templates = TEMPLATES[group];
          const newIndex = (product._templateIndex + 1) % templates.length;
          const detalleEn = product.color
            ? (product.secondaryColor ? `en ${product.color} y ${product.secondaryColor}` : `en ${product.color}`)
            : "de estilo urbano";
          const productoWord = normalizeForMatch((product.type || "").split(/\s+/)[0] || "modelo");
          let text = templates[newIndex]({ producto: productoWord, detalleEn });
          text = text.replace(/\s+/g, " ").trim().replace(/\b(\w+)\s+\1\b/gi, "$1");
          if (!/[.!?]$/.test(text)) text += ".";
          product.description = text;
          product._templateIndex = newIndex;
          run = 0;
        }
      } else {
        run = 1;
        lastIndex = product._templateIndex;
      }
    }
  }

  // Limpiar campos internos y recalcular searchText con la descripción final
  for (const p of products) {
    delete p._templateGroup;
    delete p._templateIndex;
  }

  // ---------------------------------------------------------------------
  // Escribir assets/js/productos.generated.js
  // ---------------------------------------------------------------------
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const header = `// Archivo generado automáticamente por scripts/generar-productos.js
// No editar a mano — los cambios se perderán al volver a ejecutar:
//   npm run generar-productos
// Generado: ${new Date().toISOString()}
`;

  const body = `window.INTICUSCO_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;

  fs.writeFileSync(OUTPUT_FILE, header + body, "utf8");

  // ---------------------------------------------------------------------
  // Validaciones internas (Sección 38)
  // ---------------------------------------------------------------------
  const slugCounts = {};
  const idCounts = {};
  products.forEach((p) => {
    slugCounts[p.slug] = (slugCounts[p.slug] || 0) + 1;
    idCounts[p.id] = (idCounts[p.id] || 0) + 1;
  });
  const duplicateSlugs = Object.keys(slugCounts).filter((s) => slugCounts[s] > 1);
  const duplicateIds = Object.keys(idCounts).filter((s) => idCounts[s] > 1);

  const pricePendingCount = products.filter((p) => p.pricePending).length;
  const newArrivalCount = products.filter((p) => p.newArrival).length;
  const trendingCount = products.filter((p) => p.trending).length;
  const bestSellerCount = products.filter((p) => p.bestSeller).length;

  // ---------------------------------------------------------------------
  // Reporte por consola
  // ---------------------------------------------------------------------
  console.log("");
  console.log("=== Generación de catálogo IntiCusco (V2) ===");
  console.log(`Carpetas encontradas: ${folderNames.length}`);
  console.log(`Productos generados: ${products.length}`);
  console.log(`Productos en Tendencias: ${trendingCount}`);
  console.log(`Productos Más vendidos: ${bestSellerCount}`);
  console.log(`Productos en Nuevos ingresos: ${newArrivalCount}`);
  console.log(`Productos con precio pendiente (pricePending): ${pricePendingCount}`);
  console.log(`Slugs duplicados: ${duplicateSlugs.length}`);
  console.log(`IDs duplicados: ${duplicateIds.length}`);
  console.log(`Archivo generado: ${path.relative(ROOT, OUTPUT_FILE)}`);

  if (unknownFolders.length) {
    console.log("");
    console.log("Carpetas SIN configuración (ignoradas, agrégalas a FOLDER_CONFIG):");
    unknownFolders.forEach((f) => console.log(`  - ${f}`));
  }

  if (ignoredFiles.length) {
    console.log("");
    console.log(`Archivos ignorados (no son imagen o coinciden con patrón de exclusión): ${ignoredFiles.length}`);
    ignoredFiles.slice(0, 20).forEach((f) => console.log(`  - ${f}`));
    if (ignoredFiles.length > 20) console.log(`  ... y ${ignoredFiles.length - 20} más`);
  }

  if (warnings.length) {
    console.log("");
    console.log(`Advertencias: ${warnings.length}`);
    warnings.slice(0, 30).forEach((w) => console.log(`  - ${w}`));
    if (warnings.length > 30) console.log(`  ... y ${warnings.length - 30} más`);
  }

  if (duplicateSlugs.length || duplicateIds.length) {
    console.log("");
    console.log("¡ATENCIÓN! Se encontraron slugs o IDs duplicados — revisar lógica de sufijos.");
  }

  console.log("");
}

main();
