// Falla (exit 1) si algún idioma no tiene exactamente las mismas claves que en.json, si falta un {{placeholder}} o si hay valores vacíos.
const fs = require('fs'); const path = require('path');
const dir = path.join(__dirname, '..', 'src', 'locales');
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => v && typeof v === 'object' ? flat(v, p + k + '.') : [[p + k, v]]);
const ref = new Map(flat(JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'))));
const EXPECTED = ['es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
let bad = 0;
for (const l of EXPECTED) {
  const f = path.join(dir, l + '.json');
  if (!fs.existsSync(f)) { console.error(`✗ ${l}: falta el archivo`); bad++; continue; }
  const m = new Map(flat(JSON.parse(fs.readFileSync(f, 'utf8'))));
  const miss = [...ref.keys()].filter((k) => !m.has(k)), extra = [...m.keys()].filter((k) => !ref.has(k));
  const empty = [...m].filter(([, v]) => typeof v === 'string' && !v.trim()).map(([k]) => k);
  const ph = [...ref].filter(([k, v]) => m.has(k) && String(v).match(/{{\w+}}/g)?.some((x) => !String(m.get(k)).includes(x))).map(([k]) => k);
  for (const [n, a] of [['faltan', miss], ['sobran', extra], ['vacías', empty], ['placeholder roto', ph]]) if (a.length) { console.error(`✗ ${l} ${n}: ${a.join(', ')}`); bad++; }
  if (!miss.length) console.log(`✓ ${l}: ${m.size} claves`);
}
// Claves usadas en el código que no existen en en.json
const used = new Set();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) for (const x of fs.readFileSync(p, 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)) used.add(x[1]); });
['app', 'src'].forEach((d) => walk(path.join(__dirname, '..', d)));
const keyset = new Set([...ref.keys()].map((k) => k.replace(/\.\d+$/, '')));
const pre = new Set([...ref.keys()].flatMap((k) => k.split('.').map((_, i, a) => a.slice(0, i + 1).join('.'))));
const unknown = [...used].filter((k) => !keyset.has(k) && !pre.has(k));
if (unknown.length) { console.error('✗ claves usadas en el código sin traducción: ' + unknown.join(', ')); bad++; }
if (bad) { console.error(`\n${bad} problema(s) de traducción`); process.exit(1); }
console.log('\nTodas las traducciones están completas.');
