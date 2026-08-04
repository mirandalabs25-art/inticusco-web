#!/usr/bin/env node
"use strict";

/**
 * Generador de catálogo IntiCusco.
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

// ---------------------------------------------------------------------------
// 1. Mapa de carpetas -> categoría / precio / colecciones / tendencia
//    (Sección 18 del brief. Las claves son los nombres REALES de carpeta en disco.)
// ---------------------------------------------------------------------------

const FOLDER_CONFIG = {
  "Bandanas": {
    titleBase: "Bandana", category: "Bandanas", subcategory: "Accesorios", type: "Bandanas",
    price: 10, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Bataclavas o pasamontañas": {
    titleBase: "Pasamontañas", category: "Balaclavas o pasamontañas", subcategory: "Accesorios", type: "Balaclavas",
    price: 25, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Big spin": {
    titleBase: "Gorra estilo Big Spin", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Big Spin", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Bigyou": {
    titleBase: "Gorra estilo Big You", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Big You", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Boinas en tela y paño": {
    titleBase: "Boina", category: "Boinas", subcategory: "Boinas", type: "Boinas",
    priceRule: "boina", collections: ["Adultos", "Mujeres"]
  },
  "Calvin Klein": {
    titleBase: "Gorra estilo Calvin Klein", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Calvin Klein", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Caminera": {
    titleBase: "Gorra camionera", category: "Gorras", subcategory: "Por tipo", type: "Camioneras o trucker",
    price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Chullos": {
    titleBase: "Chullo", category: "Chullos", subcategory: "Abrigo", type: "Chullos",
    priceRule: "chullo", collections: ["Adultos", "Familias"]
  },
  "Chullos en Hilo": {
    titleBase: "Chullo tejido en hilo", category: "Chullos", subcategory: "Abrigo", type: "Chullos tejidos en hilo",
    priceRule: "chullo", collections: ["Adultos", "Familias"]
  },
  "Columbia": {
    titleBase: "Gorra estilo Columbia", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Columbia", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "En tela DRILL para niño y niña": {
    titleBase: "Gorra infantil en tela drill", category: "Gorras", subcategory: "Infantiles", type: "Gorras infantiles en tela drill",
    price: 40, collections: ["Niños", "Familias"]
  },
  "Equipo de futbol": {
    titleBase: "Gorra de equipo de fútbol", category: "Gorras", subcategory: "Temáticas", type: "Gorras de equipos de futbol",
    price: 40, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gorra rusa mujer": {
    titleBase: "Gorra rusa para mujer", category: "Gorras", subcategory: "Mujeres", type: "Gorra rusa para mujer",
    price: 40, collections: ["Mujeres"]
  },
  "Gorras de Escudo de peru colores": {
    titleBase: "Gorra con escudo del Perú", category: "Gorras", subcategory: "Temáticas", type: "Gorras con escudo del Peru",
    price: 40, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gorras en POLO": {
    titleBase: "Gorra estilo Polo en tela drill", category: "Gorras", subcategory: "Por tipo", type: "Gorras estilo Polo en tela drill",
    price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gorras KepyPolo": {
    titleBase: "Gorra Kepy Polo en tela drill", category: "Gorras", subcategory: "Por tipo", type: "Gorras Kepy Polo en tela drill",
    price: 45, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gorras niños en modelo y animes": {
    titleBase: "Gorra infantil", category: "Gorras", subcategory: "Infantiles", type: "Gorras infantiles con disenos animados",
    price: 35, collections: ["Niños", "Familias"]
  },
  "Gorras prelavadas Clasicas": {
    titleBase: "Gorra clásica prelavada", category: "Gorras", subcategory: "Por tipo", type: "Gorras prelavadas clasicas",
    price: 30, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gucci": {
    titleBase: "Gorra estilo Gucci", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Gucci", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Gues": {
    titleBase: "Gorra estilo Guess", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Guess", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Hoja Latina": {
    titleBase: "Gorra Hoja Latina", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Hoja Latina", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Hugo": {
    titleBase: "Gorra estilo Hugo", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Hugo", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Lacoste": {
    titleBase: "Gorra estilo Lacoste", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Lacoste", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Michael": {
    titleBase: "Gorra estilo Michael", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Michael", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Sombreros bordados en paño": {
    titleBase: "Sombrero bordado en paño", category: "Sombreros", subcategory: "Sombreros", type: "Sombreros bordados en pano",
    price: 45, collections: ["Adultos", "Mujeres"]
  },
  "Sombreros con tela drill con encaje": {
    titleBase: "Sombrero modelo coreano con encaje", category: "Sombreros", subcategory: "Sombreros", type: "Sombreros modelo coreano con encaje",
    price: 50, collections: ["Mujeres"]
  },
  "Sombreros en Paño": {
    titleBase: "Sombrero en paño", category: "Sombreros", subcategory: "Sombreros", type: "Sombreros en pano",
    price: 45, collections: ["Adultos", "Mujeres"]
  },
  "Sombreros en teal drill doble cara": {
    titleBase: "Sombrero modelo coreano doble cara", category: "Sombreros", subcategory: "Sombreros", type: "Sombreros modelo coreano doble cara",
    price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Sombreros impermeables koreanos": {
    titleBase: "Sombrero impermeable modelo coreano", category: "Sombreros", subcategory: "Sombreros", type: "Sombreros impermeables modelo coreano",
    price: 45, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Sombreros modelo koreano en tela DRILL gruesa de una sola cara": {
    titleBase: "Sombrero modelo coreano en tela drill", category: "Sombreros", subcategory: "Sombreros", type: "Sombreros modelo coreano en tela drill",
    price: 45, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Sombreros para niñas": {
    titleBase: "Sombrero para niña", category: "Sombreros", subcategory: "Infantiles", type: "Sombreros para ninas",
    price: 35, collections: ["Niños", "Familias"]
  },
  "Urbanas": {
    titleBase: "Gorra urbana", category: "Gorras", subcategory: "Por tipo", type: "Gorras urbanas unisex",
    price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Versace": {
    titleBase: "Gorra estilo Versace", category: "Gorras", subcategory: "Estilos y diseños", type: "Gorras",
    style: "Versace", price: 50, collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Viceras en tela y algodón": {
    titleBase: "Visera", category: "Viseras", subcategory: "Viseras", type: "Viseras",
    priceRule: "visera", collections: ["Adultos", "Jovenes", "Unisex"]
  },
  "Vintage o Prelavadas": {
    titleBase: "Gorra vintage o prelavada", category: "Gorras", subcategory: "Por tipo", type: "Gorras vintage o prelavadas",
    price: 40, collections: ["Adultos", "Jovenes", "Unisex"]
  }
};

// Carpetas marcadas como Tendencias (Sección 24). Solo se marcan 1-2 productos
// "semilla" por carpeta, no la carpeta completa.
const TRENDING_FOLDERS = {
  "Caminera": { priority: 100, bestSeller: true, seedCount: 2 },
  "Urbanas": { priority: 95, seedCount: 2 },
  "Vintage o Prelavadas": { priority: 90, seedCount: 2 },
  "Gorras prelavadas Clasicas": { priority: 85, seedCount: 1 },
  "Gorras KepyPolo": { priority: 80, seedCount: 1 },
  "Gorra rusa mujer": { priority: 75, seedCount: 1 },
  "Sombreros modelo koreano en tela DRILL gruesa de una sola cara": { priority: 70, seedCount: 1 },
  "Sombreros en teal drill doble cara": { priority: 65, seedCount: 1 },
  "Sombreros con tela drill con encaje": { priority: 60, seedCount: 1 }
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

const COLOR_WORDS = [
  "negro", "blanco", "beige", "marron", "camel", "azul", "celeste", "rojo", "verde",
  "rosado", "rosa", "morado", "lila", "gris", "amarillo", "naranja", "crema", "vino",
  "guinda", "caqui", "khaki", "multicolor", "dorado", "plateado", "oliva", "fucsia", "turquesa"
];

const COLOR_LABELS = {
  marron: "marrón", khaki: "caqui"
};

function detectColors(rawName) {
  const norm = normalizeForMatch(rawName);
  const found = [];
  for (const word of COLOR_WORDS) {
    if (found.length >= 2) break;
    const re = new RegExp("\\b" + word + "\\b", "i");
    if (re.test(norm) && !found.includes(word)) {
      found.push(word);
    }
  }
  const label = (w) => COLOR_LABELS[w] || w;
  return {
    color: found[0] ? label(found[0]) : null,
    secondaryColor: found[1] ? label(found[1]) : null
  };
}

function slugify(value) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripExtension(filename) {
  return filename.replace(/\.[^.]+$/, "");
}

function stripOrderingNumbers(text) {
  return text
    .replace(/^\s*\(?\d{1,3}\)?[\s.\-]+/, "")
    .replace(/[\s.\-]+\(?\d{1,3}\)?\s*$/, "");
}

const GENERIC_FILLER_WORDS = new Set([
  "gorra", "gorras", "sombrero", "sombreros", "sombrera", "sombre", "con", "de", "del",
  "la", "el", "los", "las", "logo", "color", "marca", "es", "un", "una", "tiene",
  "lleva", "y", "en", "para", "co", "conta",
  // Alias de marca/carpeta que quedan pegados o mal escritos en los nombres de archivo
  // y que ya están representados en el titleBase, para no repetirlos.
  "bigspin", "bigyu", "bigyou", "kepypolo", "koreano", "colo",
  // Palabras prohibidas por la restricción de réplicas (Sección 5): nunca deben
  // aparecer en un título aunque estén sueltas en el nombre del archivo.
  "original", "originales", "autentico", "oficial", "licencia", "licenciado", "licenciada",
  "autorizado", "autentica"
]);

function buildDetailPhrase(fileBase, titleBaseWords) {
  let s = fileBase.replace(/[_\-]+/g, " ");
  s = stripOrderingNumbers(s);
  // "sin marca" es una etiqueta técnica ("sin-marca-01"), no una descripción real
  // del producto — se retira como frase completa antes de tokenizar.
  s = s.replace(/\bsin\s+marca\b/gi, " ");
  s = s.replace(/[,.:;]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  const stop = new Set(GENERIC_FILLER_WORDS);
  for (const w of titleBaseWords) stop.add(normalizeForMatch(w));

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
// 3. Descripciones estables (Sección 15/16)
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
  ]
};

const FALLBACK_DESCRIPTION =
  "Un modelo alegre y versátil para complementar diferentes estilos. Escríbenos por WhatsApp para consultar disponibilidad y más detalles.";

function pickTemplateGroup(product) {
  if (product.collections.includes("Niños")) return "ninos";
  if (product.category === "Sombreros") return "sombreros";
  if (["Bandanas", "Balaclavas o pasamontañas", "Viseras", "Boinas", "Chullos"].includes(product.category)) return "accesorios";
  return "gorras";
}

function buildDescription(product, productoWord) {
  const group = pickTemplateGroup(product);
  const templates = TEMPLATES[group];
  const detalleEn = product.color
    ? (product.secondaryColor ? `en ${product.color} y ${product.secondaryColor}` : `en ${product.color}`)
    : "de estilo urbano";

  const idx = getStableTemplateIndex(product.slug, templates.length);
  let text = templates[idx]({ producto: productoWord, detalleEn });

  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/\b(\w+)\s+\1\b/gi, "$1");
  if (!/[.!?]$/.test(text)) text += ".";

  if (text.split(/\s+/).length < 6) return FALLBACK_DESCRIPTION;
  return { text, templateIndex: idx, group };
}

// ---------------------------------------------------------------------------
// 4. Precios (Secciones 17/19/20)
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
    finalPrice: salePrice,
    regularPrice,
    salePrice,
    savings,
    discountPercentage: calculateDiscountPercentage(regularPrice, salePrice),
    promotionActive: true
  };
}

function resolvePrice(config, rawFilename, warnings, folderName) {
  if (typeof config.price === "number") return config.price;

  const norm = normalizeForMatch(rawFilename);

  if (config.priceRule === "boina") {
    if (norm.includes("pano") || norm.includes("paño")) return 45;
    if (norm.includes("tela")) return 35;
    warnings.push(`No se pudo determinar tela/paño para boina: "${folderName}/${rawFilename}". Se asignó S/35 por defecto.`);
    return 35;
  }

  if (config.priceRule === "chullo") {
    if (norm.includes("sin orejera") || norm.includes("solo chullo")) return 40;
    if (norm.includes("orejera")) return 50;
    warnings.push(`No se pudo determinar orejera para chullo: "${folderName}/${rawFilename}". Se asignó S/40 por defecto.`);
    return 40;
  }

  if (config.priceRule === "visera") {
    if (norm.includes("algodon")) return 30;
    if (norm.includes("tela")) return 35;
    warnings.push(`No se pudo determinar algodón/tela para visera: "${folderName}/${rawFilename}". Se asignó S/30 por defecto.`);
    return 30;
  }

  warnings.push(`Carpeta sin precio configurado: "${folderName}". Se asignó S/40 por defecto.`);
  return 40;
}

// ---------------------------------------------------------------------------
// 5. Recorrido de Gorras/
// ---------------------------------------------------------------------------

function toWebPath(absPath) {
  const rel = path.relative(ROOT, absPath).split(path.sep);
  return rel.map((segment) => encodeURIComponent(segment)).join("/");
}

function main() {
  const warnings = [];
  const ignoredFiles = [];
  const unknownFolders = [];
  const products = [];
  const usedSlugs = new Set();

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
    const entries = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((name) => {
        const ext = path.extname(name).toLowerCase();
        if (!IMAGE_EXTENSIONS.has(ext)) {
          if (!name.startsWith("_rename-log")) ignoredFiles.push(`${folderName}/${name}`);
          return false;
        }
        return true;
      })
      .sort((a, b) => collator.compare(a, b));

    const titleBaseWords = config.titleBase.split(/\s+/);
    const productoWord = normalizeForMatch(config.titleBase.split(/\s+/)[0]);

    let seedsAssigned = 0;
    const trendConfig = TRENDING_FOLDERS[folderName];

    entries.forEach((filename, index) => {
      const ext = path.extname(filename);
      const fileBase = stripExtension(filename);
      const rawForColor = `${folderName} ${fileBase}`;

      const { color, secondaryColor } = detectColors(rawForColor);
      const detail = buildDetailPhrase(fileBase, titleBaseWords);

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

      const price = resolvePrice(config, fileBase, warnings, folderName);
      const priceData = createPriceData(price);

      const product = {
        id: slug,
        slug,
        title,
        category: config.category,
        subcategory: config.subcategory,
        type: config.type,
        style: config.style || null,
        collections: config.collections.slice(),
        color,
        secondaryColor,
        ...priceData,
        available: true,
        featured: false,
        bestSeller: false,
        newArrival: false,
        trending: false,
        trendPriority: 0,
        image: toWebPath(path.join(folderPath, filename)),
        originalFile: path.relative(ROOT, path.join(folderPath, filename)).split(path.sep).join("/")
      };

      const desc = buildDescription(product, productoWord);
      if (typeof desc === "string") {
        product.description = desc;
        product._templateGroup = "fallback";
      } else {
        product.description = desc.text;
        product._templateGroup = desc.group;
        product._templateIndex = desc.templateIndex;
      }

      if (trendConfig && seedsAssigned < trendConfig.seedCount) {
        product.trending = true;
        product.trendPriority = trendConfig.priority;
        if (trendConfig.bestSeller) product.bestSeller = true;
        product.featured = true;
        seedsAssigned++;
      }

      products.push(product);
    });
  }

  // Evitar que una misma plantilla de descripción se repita más de 3 veces seguidas
  // dentro del mismo grupo (Sección 16).
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
          const productoWord = normalizeForMatch(product.type.split(/\s+/)[0]);
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

  // Limpiar campos internos antes de exportar
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
  // Reporte por consola
  // ---------------------------------------------------------------------
  console.log("");
  console.log("=== Generación de catálogo IntiCusco ===");
  console.log(`Carpetas encontradas: ${folderNames.length}`);
  console.log(`Productos generados: ${products.length}`);
  console.log(`Productos en Tendencias: ${products.filter((p) => p.trending).length}`);
  console.log(`Archivo generado: ${path.relative(ROOT, OUTPUT_FILE)}`);

  if (unknownFolders.length) {
    console.log("");
    console.log("Carpetas SIN configuración (ignoradas, agrégalas a FOLDER_CONFIG):");
    unknownFolders.forEach((f) => console.log(`  - ${f}`));
  }

  if (ignoredFiles.length) {
    console.log("");
    console.log(`Archivos ignorados (no son imagen): ${ignoredFiles.length}`);
    ignoredFiles.slice(0, 20).forEach((f) => console.log(`  - ${f}`));
    if (ignoredFiles.length > 20) console.log(`  ... y ${ignoredFiles.length - 20} más`);
  }

  if (warnings.length) {
    console.log("");
    console.log(`Advertencias de precio (se asignó un valor por defecto, revisar): ${warnings.length}`);
    warnings.slice(0, 30).forEach((w) => console.log(`  - ${w}`));
    if (warnings.length > 30) console.log(`  ... y ${warnings.length - 30} más`);
  }

  console.log("");
}

main();
