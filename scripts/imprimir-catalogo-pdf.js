#!/usr/bin/env node
"use strict";

/**
 * Convierte catalogo-pdf/catalogo-impresion.html a PDF usando Chrome headless
 * vía el protocolo DevTools (CDP) directamente — sin instalar Puppeteer ni
 * ninguna dependencia. Usa fetch/WebSocket nativos de Node.
 *
 * El pie de página muestra SOLO el número de página ("Página X de Y"),
 * sin fecha, hora ni URL — tal como se pidió.
 *
 * Uso: node scripts/imprimir-catalogo-pdf.js
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HTML_PATH = path.join(ROOT, "catalogo-pdf", "catalogo-impresion.html");
const OUT_PATH = path.join(ROOT, "catalogo-pdf", "Catalogo-IntiCusco.pdf");
const PROFILE_DIR = "C:\\ic-pdf-profile";
const PORT = 9222;

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No se encontró Chrome ni Edge instalado en las rutas esperadas.");
}

function fileUrl(p) {
  return "file:///" + p.split(path.sep).map(encodeURIComponent).join("/");
}

async function waitForDebugger() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return;
    } catch (e) { /* Chrome aún no levantó, reintentar */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Chrome no respondió en el puerto de depuración a tiempo.");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!fs.existsSync(HTML_PATH)) {
    console.error("No existe " + HTML_PATH + " — corre primero: node scripts/generar-catalogo-pdf.js");
    process.exit(1);
  }

  const chromePath = findChrome();
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });

  console.log("Iniciando Chrome headless...");
  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--no-first-run",
    "--disable-gpu",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE_DIR}`
  ], { stdio: "ignore" });

  let exitCode = 0;
  try {
    await waitForDebugger();

    const targetUrl = fileUrl(HTML_PATH);
    console.log("Abriendo:", targetUrl);
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(targetUrl)}`, { method: "PUT" });
    if (!newTabRes.ok) throw new Error("No se pudo crear la pestaña: " + newTabRes.status);
    const tab = await newTabRes.json();
    if (!tab.webSocketDebuggerUrl) throw new Error("La pestaña no devolvió webSocketDebuggerUrl.");

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });

    let msgId = 0;
    const pending = new Map();
    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (data.id !== undefined && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      }
    });
    function send(method, params) {
      return new Promise((resolve) => {
        const id = ++msgId;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    }

    await send("Page.enable", {});

    console.log("Esperando a que la página cargue...");
    await new Promise((resolve) => {
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.method === "Page.loadEventFired") {
          ws.removeEventListener("message", handler);
          resolve();
        }
      };
      ws.addEventListener("message", handler);
    });

    // Margen extra para que las ~490 imágenes locales terminen de decodificarse.
    console.log("Esperando a que las imágenes terminen de cargar...");
    await sleep(8000);

    console.log("Generando PDF con números de página (sin fecha/hora)...");
    const footerTemplate = `
      <div style="width:100%; font-size:9px; color:#6B432B; text-align:center; font-family:Arial, sans-serif; -webkit-print-color-adjust:exact;">
        Página <span class="pageNumber"></span> de <span class="totalPages"></span>
      </div>`;

    const printResult = await send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: false,
      paperWidth: 8.27,
      paperHeight: 11.69,
      marginTop: 0.35,
      marginBottom: 0.55,
      marginLeft: 0.4,
      marginRight: 0.4,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate
    });

    if (!printResult.result || !printResult.result.data) {
      throw new Error("Chrome no devolvió datos del PDF: " + JSON.stringify(printResult).slice(0, 500));
    }

    fs.writeFileSync(OUT_PATH, Buffer.from(printResult.result.data, "base64"));
    ws.close();

    const sizeMb = (fs.statSync(OUT_PATH).size / (1024 * 1024)).toFixed(1);
    console.log("");
    console.log("=== PDF generado ===");
    console.log("Archivo:", path.relative(ROOT, OUT_PATH));
    console.log("Tamaño:", sizeMb, "MB");
    console.log("");
  } catch (err) {
    console.error("ERROR:", err.message);
    exitCode = 1;
  } finally {
    chromeProc.kill();
    fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  }
  process.exit(exitCode);
}

main();
