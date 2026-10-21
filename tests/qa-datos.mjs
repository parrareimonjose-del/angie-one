// QA web de la Sección de Datos (ES + EN). Capturas: /workspace/calorias/mvp-capturas/datos-*.png
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765/angie-one';
const OUT = '/workspace/calorias/mvp-capturas/';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const lang of ['es', 'en']) {
  const L = lang === 'es';
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, locale: L ? 'es-ES' : 'en-US', acceptDownloads: true });
  const now = Date.now();
  const st = { aiEnabled: true, entries: [{ id: 'e1', date: '2026-10-15', time: now, name: 'Arepa', kcal: 300, p: 1, c: 1, f: 1, source: 'manual' }], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: now - 3600e3,
    profile: { goal: 'lose', weight: 80, height: 170, age: 45, sex: 'female', activity: 2 }, ext: { weights: [{ date: '2026-10-10', kg: 80 }], sleep: [{ date: '2026-10-14', h: 7, stress: 2 }] } };
  await ctx.addInitScript((s) => { localStorage.setItem('angieone:founder', '1'); if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, st);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(600); };
  const shot = (n) => p.screenshot({ path: `${OUT}datos-${lang}-${n}.png` });
  const btn = (name) => p.getByRole('button', { name, exact: false }).first();
  const has = async (re) => (await p.getByText(re).count()) > 0;
  const data = () => p.evaluate(() => JSON.parse(localStorage.getItem('angieone:v1')).ext?.datos || null);
  await go('/more'); ok(`${lang} entrada en Más`, await has(L ? 'Mis recibos y datos' : 'My receipts & data'));
  await go('/datos'); ok(`${lang} aviso salud`, await p.getByTestId('no-health').count() > 0);
  ok(`${lang} casilla sin marcar`, (await p.getByTestId('consent-box').getAttribute('aria-checked')) === 'false');
  await btn(L ? 'Aceptar' : 'Accept').click(); await p.waitForTimeout(300); ok(`${lang} sin casilla no acepta`, await p.getByTestId('consent-on').count() === 0);
  await shot('01-permiso');
  await p.getByTestId('consent-box').click(); await btn(L ? 'Aceptar' : 'Accept').click(); await p.waitForTimeout(300); ok(`${lang} permiso activo`, await p.getByTestId('consent-on').count() > 0);
  for (let i = 0; i < 6; i++) { await btn(L ? 'Probar un ejemplo' : 'Try an example').click(); await p.waitForTimeout(150); }
  ok(`${lang} 5 recibos = 15 pts, sexto bloqueado`, (await p.getByTestId('dt-points').textContent()) === '15' && await has(L ? 'Límite alcanzado' : 'Limit reached'));
  await p.getByTestId('survey-shop').getByRole('button').first().click(); await p.waitForTimeout(300);
  ok(`${lang} encuesta +2`, (await p.getByTestId('dt-points').textContent()) === '17');
  await shot('02-recibos-puntos');
  let d = await data(); const keys = JSON.stringify(d.master);
  ok(`${lang} copia maestra sin salud`, !/weight|kcal|sleep|Arepa|memory|chat/i.test(keys), keys.slice(0, 80));
  ok(`${lang} punteros sin duplicar`, Object.keys(d.master).length === 6 && d.lists.consumo.length === 5);
  // Mensual
  await go('/datos-mes'); ok(`${lang} costo 15-20`, /1[5-9]|20/.test(await p.getByTestId('cost').textContent()));
  await p.getByTestId('survey-gap').getByRole('button').first().click(); await p.waitForTimeout(300);
  await btn(L ? 'Obtener informe' : 'Get report').click(); await p.waitForTimeout(300);
  ok(`${lang} informe mensual`, await p.getByTestId('report').count() > 0 && await p.getByTestId('disclaimer').count() > 0); await shot('03-mensual');
  // Anual: dar 100 puntos de ejemplo
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('angieone:v1')); s.ext.datos.points += 100; localStorage.setItem('angieone:v1', JSON.stringify(s)); });
  await go('/datos-anual'); ok(`${lang} anual 100`, /100/.test(await p.getByTestId('cost').textContent()));
  await p.getByTestId('survey-gap').getByRole('button').first().click(); await p.waitForTimeout(300);
  await btn(L ? 'Obtener informe' : 'Get report').click(); await p.waitForTimeout(300);
  ok(`${lang} preguntas contador`, await has(L ? 'Preguntas que hará tu contador' : 'Questions your accountant will ask'));
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), btn(L ? 'Descargar PDF' : 'Download PDF').click()]);
  if (dl) { const f = `/workspace/calorias/datos-informe-anual-${lang}.pdf`; await dl.saveAs(f); const { readFileSync } = await import('node:fs'); const x = readFileSync(f, 'latin1'); ok(`${lang} PDF anual`, x.startsWith('%PDF') && /contador|accountant/.test(x)); } else ok(`${lang} PDF anual`, false);
  await shot('04-anual');
  // Panel fundador
  await go('/founder'); await p.getByTestId('founder-data').scrollIntoViewIfNeeded();
  ok(`${lang} 6 listas`, (await p.locator('[data-testid^="list-"]').count()) === 6);
  ok(`${lang} aviso listas listas`, await p.getByTestId('ready-notice').count() > 0);
  ok(`${lang} estudio estimado`, await has(L ? 'DATOS DE EJEMPLO / estimado' : 'SAMPLE DATA / estimate'));
  ok(`${lang} min 50 en lista pequeña`, await p.getByTestId('list-exclusive').getByText(L ? /50 personas o más/ : /50\+ people/).count() > 0);
  await p.getByTestId('ready-notice').scrollIntoViewIfNeeded(); await shot('05-panel-listas');
  await p.getByTestId('study-consumo').scrollIntoViewIfNeeded(); await shot('06-estudio-mercado');
  await p.getByTestId('study-consumo').getByRole('button', { name: L ? 'Aprobar' : 'Approve', exact: true }).click(); await p.waitForTimeout(300);
  ok(`${lang} aprobar no vende`, /(No se vendió nada|Nothing was sold)/.test(await p.getByTestId('dec-consumo').textContent()));
  await p.getByTestId('study-fresh').getByRole('button', { name: L ? 'Todavía no' : 'Not yet', exact: true }).click(); await p.waitForTimeout(300);
  ok(`${lang} todavía no`, await p.getByTestId('dec-fresh').count() > 0);
  const dec = await p.evaluate(() => JSON.parse(localStorage.getItem('angieone:v1')).ext.datosDec); ok(`${lang} sold=false`, Object.values(dec).every((x) => x.sold === false));
  await shot('07-aprobar');
  // Retirar permiso = cascada
  await go('/datos'); await btn(L ? 'Retirar permiso' : 'Withdraw permission').click(); await p.waitForTimeout(300);
  d = await data(); ok(`${lang} cascada borrado`, Object.keys(d.master).length === 0 && Object.values(d.lists).every((x) => x.length === 0) && !d.consent);
  const health = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('angieone:v1')); return s.entries.length === 1 && s.ext.weights.length === 1; }); ok(`${lang} salud del usuario intacta`, health);
  await shot('08-retirado');
  // Gratis: bloqueado
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('angieone:v1')); s.trialStart = Date.now() - 20 * 864e5; localStorage.setItem('angieone:v1', JSON.stringify(s)); });
  await go('/datos'); ok(`${lang} solo Premium`, await p.getByTestId('locked').count() > 0); await shot('09-gratis-bloqueado');
  ok(`${lang} sin errores`, errs.length === 0, errs.join('|').slice(0, 200));
  await ctx.close();
}
// Otros idiomas: la pantalla carga sin claves crudas
for (const lc of ['ar', 'zh', 'hi', 'ru']) {
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, locale: lc });
  await ctx.addInitScript(() => { localStorage.setItem('angieone:founder', '1'); if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify({ aiEnabled: true, entries: [], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3, profile: { goal: 'lose', weight: 80, height: 170, age: 45, sex: 'female', activity: 2 } })); });
  const p = await ctx.newPage(); await p.goto(BASE + '/datos', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const txt = await p.evaluate(() => document.body.innerText); ok(`${lc} sin claves crudas`, !/dt\.\w/.test(txt)); await p.screenshot({ path: `${OUT}datos-${lc}-01.png` }); await ctx.close();
}
await b.close(); console.log(res.join('\n')); console.log(`${res.filter((x) => x.startsWith('PASS')).length}/${res.length}`);
