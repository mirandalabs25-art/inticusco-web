#!/usr/bin/env node
"use strict";

/**
 * Genera un HTML de impresión con TODAS las fotos del catálogo IntiCusco,
 * organizado por secciones (una por carpeta real), listo para convertir a PDF.
 * No muestra fecha/hora de generación — solo contenido y número de páginas
 * (el número de página lo agrega scripts/imprimir-catalogo-pdf.js al imprimir).
 *
 * Uso: node scripts/generar-catalogo-pdf.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "catalogo-pdf");
const OUT_HTML = path.join(OUT_DIR, "catalogo-impresion.html");
const PRODUCTS_FILE = path.join(ROOT, "assets", "js", "productos.generated.js");

function loadProducts() {
  const src = fs.readFileSync(PRODUCTS_FILE, "utf8").replace(
    "window.INTICUSCO_PRODUCTS =",
    "module.exports ="
  );
  // eslint-disable-next-line no-eval
  return eval(src);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Orden de secciones del catálogo impreso — una por carpeta real de Gorras/.
// Cualquier carpeta nueva que no esté en esta lista se agrega igual al final
// automáticamente (ver buildSections), así el PDF nunca se queda corto.
const FOLDER_ORDER = [
  "Urbanas",
  "Goorin Bros o truker o camioneras",
  "Columbia",
  "Patagonia",
  "Noth Face",
  "Cristian Daniel",
  "Gorras Arabe",
  "Gorras originales POLO",
  "Big spin",
  "Bigyou",
  "Calvin Klein",
  "Lacoste",
  "Hoja Latina",
  "Gucci",
  "Gues",
  "Versace",
  "Michael",
  "Hugo",
  "Vintage o Prelavadas",
  "Gorras prelavadas Clasicas",
  "Gorras en POLO",
  "Gorras KepyPolo",
  "Equipo de futbol",
  "Gorras de Escudo de peru colores",
  "Gorra rusa mujer",
  "En tela DRILL para niño y niña",
  "Gorras niños en modelo y animes",
  "Viceras en tela y algodón",
  "Sombreros bordados en paño",
  "Sombreros con tela drill con encaje",
  "Sombreros en Paño",
  "Sombreros en teal drill doble cara",
  "Sombreros impermeables koreanos",
  "Sombreros modelo koreano en tela DRILL gruesa de una sola cara",
  "Sombreros para niñas",
  "Boinas de Mujer",
  "Boinas en tela y paño",
  "Chullos",
  "Chullos en Hilo",
  "Bataclavas o pasamontañas",
  "Bandanas"
];

function buildSections(products) {
  const byFolder = new Map();
  for (const p of products) {
    if (!byFolder.has(p.folder)) byFolder.set(p.folder, []);
    byFolder.get(p.folder).push(p);
  }

  const sections = [];
  const usedFolders = new Set();

  for (const folder of FOLDER_ORDER) {
    const items = byFolder.get(folder);
    if (items && items.length) {
      sections.push({ title: items[0].normalizedFolder || folder, items });
      usedFolders.add(folder);
    }
  }

  // Carpetas nuevas que aún no están en FOLDER_ORDER: se agregan igual, al final.
  for (const [folder, items] of byFolder.entries()) {
    if (!usedFolders.has(folder) && items.length) {
      sections.push({ title: items[0].normalizedFolder || folder, items });
    }
  }

  return sections;
}

function cardHtml(p) {
  const priceHtml = p.pricePending
    ? `<span class="pending">Consultar precio</span>`
    : `<span class="reg">S/${p.regularPrice}</span> <span class="final">S/${p.salePrice}</span>`;
  return `
  <div class="card">
    <div class="card-img"><img src="../${p.image}" alt="${escapeHtml(p.title)}" /></div>
    <div class="card-body">
      <p class="card-title">${escapeHtml(p.title)}</p>
      <p class="card-color">${p.color ? escapeHtml(p.color) + (p.secondaryColor ? " / " + escapeHtml(p.secondaryColor) : "") : "Consultar colores"}</p>
      <p class="card-price">${priceHtml}</p>
    </div>
  </div>`;
}

function sectionHtml(section, index) {
  return `
  <section class="catalog-section">
    <h2>${index}. ${escapeHtml(section.title)} <span class="count">(${section.items.length})</span></h2>
    <div class="grid">
      ${section.items.map(cardHtml).join("")}
    </div>
  </section>`;
}

function main() {
  const products = loadProducts();
  const sections = buildSections(products);

  const toc = sections
    .map((s, i) => `<li><span>${i + 1}. ${escapeHtml(s.title)}</span><span class="dots"></span><span>${s.items.length} modelos</span></li>`)
    .join("");

  const body = sections.map((s, i) => sectionHtml(s, i + 1)).join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Catálogo IntiCusco</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Arial, sans-serif;
    color: #34241B;
    margin: 0;
  }
  .cover {
    height: 265mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    page-break-after: always;
  }
  .cover img.logo { width: 220px; margin-bottom: 26px; }
  .cover h1 { font-size: 30px; color: #3E281D; margin: 0 0 10px; }
  .cover p.tag { font-size: 15px; color: #76665C; margin: 0 0 30px; }
  .cover .info { font-size: 13px; color: #34241B; line-height: 1.9; border-top: 1px solid #E4D9CC; padding-top: 20px; margin-top: 10px; }
  .cover .info strong { color: #3E281D; }

  .toc { page-break-after: always; padding-top: 10mm; }
  .toc h2 { font-size: 20px; color: #3E281D; border-bottom: 2px solid #6B432B; padding-bottom: 8px; }
  .toc ul { list-style: none; padding: 0; margin: 18px 0 0; }
  .toc li { display: flex; align-items: baseline; gap: 6px; font-size: 13px; padding: 5px 0; }
  .toc li .dots { flex: 1; border-bottom: 1px dotted #C9B8A6; margin: 0 6px; height: 1px; }

  .catalog-section { page-break-before: always; padding-top: 6mm; }
  .catalog-section h2 {
    font-size: 17px; color: #3E281D;
    border-bottom: 2px solid #6B432B;
    padding-bottom: 6px; margin: 0 0 12px;
  }
  .catalog-section h2 .count { font-size: 11px; color: #9A6A48; font-weight: normal; }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .card {
    border: 1px solid #E4D9CC;
    border-radius: 7px;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .card-img { width: 100%; height: 55mm; background: #F0E7DB; }
  .card-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card-body { padding: 7px 9px 10px; }
  .card-title { font-size: 11px; font-weight: 600; line-height: 1.3; margin: 0 0 3px; color: #34241B; height: 28px; overflow: hidden; }
  .card-color { font-size: 9.5px; color: #76665C; margin: 0 0 4px; text-transform: capitalize; }
  .card-price { margin: 0; font-size: 11px; }
  .card-price .reg { color: #9A6A48; text-decoration: line-through; margin-right: 6px; }
  .card-price .final { color: #6B432B; font-weight: 800; font-size: 14px; }
  .card-price .pending { color: #9A6A48; font-weight: 700; font-size: 11px; }

  .footer-note { font-size: 9px; color: #9A6A48; text-align: center; margin-top: 10mm; }
</style>
</head>
<body>

  <div class="cover">
    <img class="logo" src="../assets/logo.jpg" alt="IntiCusco" />
    <h1>Catálogo IntiCusco</h1>
    <p class="tag">Gorras, sombreros, boinas, chullos y accesorios para toda la familia</p>
    <div class="info">
      <p><strong>Dirección:</strong> Calle Belén 452, Cusco, Perú</p>
      <p><strong>Horario:</strong> Todos los días, 9:00 a. m. – 9:00 p. m.</p>
      <p><strong>WhatsApp:</strong> +51 993 242 555</p>
      <p><strong>Correo:</strong> luzmarina4411@gmail.com</p>
      <p><strong>Facebook:</strong> facebook.com/gorrascusco1</p>
    </div>
  </div>

  <div class="toc">
    <h2>Contenido</h2>
    <ul>${toc}</ul>
    <p class="footer-note">Los modelos son diseños inspirados en distintos estilos, disponibles en diferentes variantes. Consulta disponibilidad y colores por WhatsApp.</p>
  </div>

  ${body}

</body>
</html>`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_HTML, html, "utf8");

  console.log("");
  console.log("=== Catálogo PDF (HTML de impresión) generado ===");
  console.log(`Secciones: ${sections.length}`);
  console.log(`Productos incluidos: ${products.length}`);
  console.log(`Archivo: ${path.relative(ROOT, OUT_HTML)}`);
  console.log("");
}

main();
