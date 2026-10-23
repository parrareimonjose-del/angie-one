import assert from 'assert';
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const ok = (c: boolean, m: string) => { assert.ok(c, m); console.log('PASS', m); };

const assets = ['angie-ia.png', 'angie-ia-circle.png', 'hermano-coach.png', 'hermano-coach-circle.png'];
for (const a of assets) {
  const p = path.join(root, 'assets/rostros', a);
  ok(fs.existsSync(p) && fs.statSync(p).size > 1000, `asset ${a}`);
}
const hist = fs.readFileSync(path.join(root, 'docs/historia-angie-one.md'), 'utf8');
ok(hist.includes('la IA lleva su rostro') && hist.includes('Parra Apps'), 'historia md aprobada');
const rostros = fs.readFileSync(path.join(root, 'src/rostros.ts'), 'utf8');
ok(rostros.includes("id: 'angie'") && rostros.includes("id: 'coach'"), 'rostros ids');
ok(rostros.includes('hermano-coach') && rostros.includes('angie-ia'), 'rostros assets paths');
const ui = fs.readFileSync(path.join(root, 'src/rostros-ui.tsx'), 'utf8');
ok(ui.includes('FaceProfileCard') && ui.includes('FaceChatHeader') && ui.includes('TeamTogetherCard') && ui.includes('HistoriaCard'), 'UI ambas ideas');
const chat = fs.readFileSync(path.join(root, 'app/chat.tsx'), 'utf8');
ok(chat.includes('FaceToggle') && chat.includes('FaceChatBubble'), 'chat clásico con caras');
const coach = fs.readFileSync(path.join(root, 'app/coach.tsx'), 'utf8');
ok(coach.includes('FaceProfileCard') && coach.includes("who: 'coach'"), 'coach hub con tarjeta');
const flags = fs.readFileSync(path.join(root, 'src/flags.ts'), 'utf8');
ok(/CLONE_ENABLED\s*=\s*false/.test(flags), 'CLONE sigue oculto');
const es = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/es.json'), 'utf8'));
ok(es.faces?.coachName === 'Coach' && es.faces?.angieName === 'Angie IA', 'i18n es faces');
console.log(`rostros OK`);
