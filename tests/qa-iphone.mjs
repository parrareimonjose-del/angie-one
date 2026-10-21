// QA arreglos iPhone: plan IA, voz (grabación→Worker) y código de barras (cámara + etiqueta). WebKit iPhone + Chromium, ES + EN.
import { webkit, chromium, devices } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:8765/angie-one'; const OUT = '/workspace/calorias/mvp-capturas/';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const WAV = fs.readFileSync('/tmp/v-es.wav').toString('base64'); const WAV_EN = fs.readFileSync('/tmp/v-en.wav').toString('base64');
const state = { aiEnabled: true, entries: [], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3,
  profile: { goal: 'lose', weight: 82, height: 168, age: 47, sex: 'male', activity: 2 } };
const runs = [['webkit', webkit, devices['iPhone 14']], ['chromium', chromium, { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true }]];
for (const [bn, B, dev] of runs) {
  const b = await B.launch(bn === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } : { executablePath: '/home/box/.cache/ms-playwright/webkit-2370/pw_run.sh' });
  for (const lang of ['es', 'en']) {
    const L = lang === 'es'; const tag = `${bn}-${lang}`;
    const ctx = await b.newContext({ ...dev, locale: L ? 'es-ES' : 'en-US', ...(bn === 'chromium' ? { permissions: ['microphone', 'camera'] } : {}) });
    await ctx.addInitScript(([s, wav]) => {
      if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s));
      // Micrófono simulado: reproduce una frase grabada como si fuera el micro (en el iPhone real es el micro de verdad).
      const md = navigator.mediaDevices || (navigator.mediaDevices = {});
      const proto = window.MediaDevices ? MediaDevices.prototype : md; const realF = proto.getUserMedia;
      Object.defineProperty(proto, 'getUserMedia', { configurable: true, writable: true, value: async function (c) { const real = realF && ((x) => realF.call(navigator.mediaDevices, x));
        if (c && c.audio && !c.video) { const ac = new (window.AudioContext || window.webkitAudioContext)(); const buf = await ac.decodeAudioData(Uint8Array.from(atob(wav), (x) => x.charCodeAt(0)).buffer);
          const src = ac.createBufferSource(); src.buffer = buf; const dst = ac.createMediaStreamDestination(); src.connect(dst); src.start(); window.__voiceDur = buf.duration; return dst.stream; }
        if (real) return real(c); throw Object.assign(new Error('no cam'), { name: 'NotFoundError' });
      } });
      delete window.SpeechRecognition; delete window.webkitSpeechRecognition; // como en Jose: sin dictado del navegador
    }, [state, L ? WAV : WAV_EN]);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => /gum|rror/.test(m.text()) && console.log('CONSOLE', tag, m.text()));
    const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(600); };
    const shot = (n) => p.screenshot({ path: `${OUT}iphone-fix-${tag}-${n}.png`, fullPage: true });
    const body = () => p.evaluate(() => document.body.innerText);
    // 1) Plan con IA
    await go('/coach-setup');
    for (let i = 0; i < 2; i++) { await p.getByRole('button', { name: L ? 'Siguiente' : 'Next' }).click(); await p.waitForTimeout(250); }
    await p.getByRole('button', { name: L ? /Crear plan/ : /Create plan/ }).click();
    await p.waitForURL(/\/coach$|coach-setup/, { timeout: 5000 }).catch(() => {});
    const t0 = Date.now(); await p.waitForFunction(() => !/armando tu plan|building your plan/i.test(document.body.innerText), null, { timeout: 130000 }).catch(() => {});
    await p.waitForTimeout(800); let t = await body();
    ok(`${tag} plan IA sin "ocupada"`, !/ocupada en este momento|busy right now/i.test(t), `${Math.round((Date.now() - t0) / 1000)}s`); ok(`${tag} plan abierto`, /\/coach$/.test(p.url())); await shot('01-plan');
    // 2) Voz: grabación → transcripción → estimación
    await go('/voice');
    await p.getByRole('button', { name: L ? /Toca y habla/ : /Tap and speak/ }).click();
    await p.waitForTimeout(1000); t = await body(); ok(`${tag} voz grabando`, /Toca para terminar|Tap to finish/.test(t)); await shot('02-voz-grabando');
    await p.waitForTimeout(3500); await p.getByRole('button', { name: L ? /Toca para terminar/ : /Tap to finish/ }).click();
    await p.getByTestId('voice-est').waitFor({ timeout: 60000 }).catch(() => {}); t = await body();
    ok(`${tag} voz transcrita y calculada`, (await p.getByTestId('voice-est').count()) > 0 && !/no está disponible|doesn't work/.test(t), (await p.getByTestId('voice-text').inputValue()).slice(0, 60)); await shot('03-voz-resultado');
    await p.getByTestId('voice-text').fill(L ? 'Hola cómo está todo qué estás haciendo' : 'Hi how are you what are you doing');
    await p.getByRole('button', { name: L ? /Calcular/ : /Calculate/ }).click({ timeout: 90000 }); await p.waitForTimeout(500);
    await p.waitForFunction(() => /Cuéntame qué comiste|Tell me what you ate/.test(document.body.innerText), null, { timeout: 40000 }).catch(() => {});
    ok(`${tag} saludo → mensaje amable`, /Cuéntame qué comiste|Tell me what you ate/.test(await body())); await shot('04-voz-saludo');
    // 3) Código de barras
    await go('/barcode');
    const scan = p.getByRole('button', { name: L ? /Escanear con cámara/ : /Scan with camera/ }); ok(`${tag} botón escanear`, await scan.count() > 0);
    await scan.click(); await p.waitForTimeout(2500); t = await body();
    ok(`${tag} cámara abre o avisa`, (await p.getByTestId('web-scanner').count()) > 0 || /No pude abrir la cámara|couldn't open the camera|permiso de la cámara|camera permission/.test(t)); await shot('05-escaner');
    if (await p.getByTestId('web-scanner').count()) await p.getByRole('button', { name: L ? /Cerrar cámara/ : /Close camera/ }).click();
    await p.getByRole('textbox').first().fill('5193336466'); await p.getByRole('button', { name: L ? /Buscar/ : /Search/ }).click();
    await p.getByTestId('bar-nf').waitFor({ timeout: 60000 }).catch(() => {}); ok(`${tag} no encontrado → opciones`, await p.getByTestId('bar-nf').count() > 0); await shot('06-no-encontrado');
    const fc = p.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
    await p.getByRole('button', { name: L ? /etiqueta nutricional/ : /nutrition label/ }).click(); const ch = await fc;
    if (ch) await ch.setFiles(new URL('./fixtures/label.jpg', import.meta.url).pathname);
    await p.waitForFunction(() => /Barra|bar|granola/i.test(document.body.innerText) && /190/.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {});
    ok(`${tag} foto etiqueta → 190 kcal`, /190/.test(await body())); await shot('07-etiqueta');
    ok(`${tag} sin errores js`, !errs.length, errs.join(' | ').slice(0, 200)); await ctx.close();
  }
  await b.close();
}
console.log(res.join('\n')); const f = res.filter((r) => r.startsWith('FAIL')).length; console.log(`\n${res.length - f}/${res.length} OK`); process.exit(f ? 1 : 0);
