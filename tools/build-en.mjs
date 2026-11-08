#!/usr/bin/env node
// Genera en/index.html (versión inglesa, https://cosmicworks.es/en/) a partir de index.html.
//
//   node tools/build-en.mjs           escribe en/index.html
//   node tools/build-en.mjs --check   falla si en/index.html no está al día (lo usa la Action)
//
// Las traducciones están en el bloque <script type="application/json" id="i18n-en"> de index.html:
//   data-i18n="k"            sustituye el contenido del elemento por EN[k]
//   data-i18n-<atributo>="k" sustituye ese atributo (alt, content, href, aria-label, lang...) por EN[k]
//   EN._ld                   textos del JSON-LD: { "texto en español": "texto en inglés" }
// Sin dependencias: solo Node.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'index.html'), 'utf8');
const out = join(root, 'en', 'index.html');

const enBlock = src.match(/<script type="application\/json" id="i18n-en">([\s\S]*?)<\/script>\n?/);
if (!enBlock) throw new Error('No encuentro el bloque i18n-en en index.html');
const EN = JSON.parse(enBlock[1]);
const used = new Set();
const t = (k) => {
  if (!(k in EN)) throw new Error(`Falta la traducción "${k}" en el bloque i18n-en`);
  used.add(k);
  return EN[k];
};
const attr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

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
  if (end < 0) throw new Error(`Sin cierre para <${tag} data-i18n="${key}">`);
  res += html.slice(last, start) + t(key);
  last = end;
  openRe.lastIndex = end;
}
html = res + html.slice(last);

// 2. Atributos con data-i18n-<atributo>
html = html.replace(/<[a-zA-Z][^>]*\sdata-i18n-[a-z-]+="[^"]+"[^>]*>/g, (tag) => {
  for (const [, name, key] of [...tag.matchAll(/\sdata-i18n-([a-z-]+)="([^"]+)"/g)]) {
    const re = new RegExp(`(\\s${name}=")[^"]*(")`);
    if (!re.test(tag)) throw new Error(`La etiqueta no tiene ${name}: ${tag}`);
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
      if (o['@type'] === 'WebPage') { o['@id'] = 'https://cosmicworks.es/en/#webpage'; o.url = 'https://cosmicworks.es/en/'; }
      return o;
    }
    return v;
  };
  const ld = walk(JSON.parse(json));
  for (const k of Object.keys(map)) if (!seen.has(k)) console.warn(`Aviso: _ld["${k}"] no aparece en el JSON-LD`);
  return a + '\n' + JSON.stringify(ld, null, 1) + '\n' + b;
});

html = html.replace('<!doctype html>', '<!doctype html>\n<!-- Generado desde index.html con tools/build-en.mjs. No editar a mano: cambia index.html y vuelve a ejecutarlo. -->');

if (process.argv.includes('--check')) {
  const cur = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (cur !== html) { console.error('en/index.html no está al día: ejecuta node tools/build-en.mjs'); process.exit(1); }
  console.log('en/index.html está al día');
} else {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log('Escrito en/index.html');
}
