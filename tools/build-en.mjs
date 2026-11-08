#!/usr/bin/env node
// Genera las versiones inglesas de las páginas a partir de las españolas.
//
//   node tools/build-en.mjs           escribe las páginas de PAGES
//   node tools/build-en.mjs --check   falla si alguna no está al día (lo usa la Action)
//
// Cada página española lleva sus traducciones en un bloque <script type="application/json" id="i18n-en">:
//   data-i18n="k"            sustituye el contenido del elemento por EN[k]
//   data-i18n-<atributo>="k" sustituye ese atributo (alt, content, href, aria-label, lang...) por EN[k]
//   EN.url                   URL de la versión inglesa (el WebPage del JSON-LD toma esta URL e inLanguage "en")
//   EN._ld                   textos y URLs del JSON-LD: { "en español": "en inglés" }
// Sin dependencias: solo Node.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// [página española, página inglesa que se genera]
const PAGES = [
  ['index.html', 'en/index.html'],
  ['juegos/tiki-tiki/index.html', 'en/games/tiki-tiki/index.html'],
];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const attr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function build(srcPath) {
  const src = readFileSync(join(root, srcPath), 'utf8');
  const enBlock = src.match(/<script type="application\/json" id="i18n-en">([\s\S]*?)<\/script>\n?/);
  if (!enBlock) throw new Error(`No encuentro el bloque i18n-en en ${srcPath}`);
  const EN = JSON.parse(enBlock[1]);
  const t = (k) => {
    if (!(k in EN)) throw new Error(`${srcPath}: falta la traducción "${k}" en el bloque i18n-en`);
    return EN[k];
  };

  let html = src.replace(enBlock[0], '');

  // 1. Contenido de los elementos con data-i18n (respetando etiquetas anidadas del mismo tipo)
  const openRe = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>/g;
  let res = '', last = 0, m;
  while ((m = openRe.exec(html))) {
    const tag = m[1].toLowerCase(), key = m[2];
    const start = m.index + m[0].length;
    const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
    tagRe.lastIndex = start;
    let depth = 1, tm, end = -1;
    while ((tm = tagRe.exec(html))) {
      depth += tm[1] ? -1 : 1;
      if (depth === 0) { end = tm.index; break; }
    }
    if (end < 0) throw new Error(`${srcPath}: sin cierre para <${tag} data-i18n="${key}">`);
    res += html.slice(last, start) + t(key);
    last = end;
    openRe.lastIndex = end;
  }
  html = res + html.slice(last);

  // 2. Atributos con data-i18n-<atributo>
  html = html.replace(/<[a-zA-Z][^>]*\sdata-i18n-[a-z-]+="[^"]+"[^>]*>/g, (tag) => {
    for (const [, name, key] of [...tag.matchAll(/\sdata-i18n-([a-z-]+)="([^"]+)"/g)]) {
      const re = new RegExp(`(\\s${name}=")[^"]*(")`);
      if (!re.test(tag)) throw new Error(`${srcPath}: la etiqueta no tiene ${name}: ${tag}`);
      tag = tag.replace(re, (_, a, b) => a + attr(t(key)) + b);
    }
    return tag;
  });

  // 3. Idioma del documento
  html = html.replace('<html lang="es">', '<html lang="en">');

  // 4. JSON-LD
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (_, a, json, b) => {
    const map = EN._ld || {}, seen = new Set();
    const walk = (v) => {
      if (typeof v === 'string') { if (v in map) { seen.add(v); return map[v]; } return v; }
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        const o = {};
        for (const [k, x] of Object.entries(v)) o[k] = walk(x);
        if (o['@type'] === 'WebPage') { o['@id'] = t('url') + '#webpage'; o.url = t('url'); o.inLanguage = 'en'; }
        return o;
      }
      return v;
    };
    const ld = walk(JSON.parse(json));
    for (const k of Object.keys(map)) if (!seen.has(k)) console.warn(`Aviso (${srcPath}): _ld["${k}"] no aparece en el JSON-LD`);
    return a + '\n' + JSON.stringify(ld, null, 1) + '\n' + b;
  });

  return html.replace('<!doctype html>', `<!doctype html>\n<!-- Generado desde ${srcPath} con tools/build-en.mjs. No editar a mano: cambia ${srcPath} y vuelve a ejecutarlo. -->`);
}

const check = process.argv.includes('--check');
let stale = false;
for (const [srcPath, outPath] of PAGES) {
  const html = build(srcPath), out = join(root, outPath);
  if (check) {
    const cur = existsSync(out) ? readFileSync(out, 'utf8') : '';
    if (cur !== html) { console.error(`${outPath} no está al día: ejecuta node tools/build-en.mjs`); stale = true; }
    else console.log(`${outPath} está al día`);
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    console.log(`Escrito ${outPath}`);
  }
}
if (stale) process.exit(1);
