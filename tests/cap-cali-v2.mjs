import { chromium } from 'playwright-core';
const BASE='http://localhost:8797/angie-one', O='/workspace/calorias/calistenia-capturas/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errs=[];
async function ctxFor(sex,h=880){
  const ctx = await b.newContext({ viewport: { width: 420, height: h }, locale: 'es-ES' });
  const now=Date.now(), log=[1,2,3,4,5].map(i=>({ts:now-i*864e5,w:'op',day:i,min:22,kcal:180}));
  const st = { aiEnabled: true, entries: [], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: 'es', trialStart: now-3600e3, profile: { goal:'lose', weight:82, height:168, age:45, sex:sex==='m'?'male':'female', activity:2 }, ext: { cali: { sex, tone: sex==='m'?1:0, fav:['pullup'], done:['pushup'], best:{}, log, lvl:1, op:{done:[1,2,3,4,5]}, plan:{f:[1,2,3],m:[1,2]} } } };
  await ctx.addInitScript((s)=>{localStorage.setItem('angieone:v1',JSON.stringify(s));sessionStorage.setItem('angie:splash','1');}, st);
  const p = await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e))); return p;
}
const go=async(p,r)=>{await p.goto(BASE+r+(r.includes('?')?'&':'?')+'nosplash=1',{waitUntil:'networkidle'});await p.waitForTimeout(1800);};
let p=await ctxFor('m',1500);
await go(p,'/gym'); await p.screenshot({path:O+'v2-hoy-campana.png'});
await go(p,'/gym?tab=train'); await p.screenshot({path:O+'v2-entrenar-categorias.png'});
await go(p,'/gym?tab=prog'); await p.screenshot({path:O+'v2-progreso.png'});
await go(p,'/gym?tab=perfil'); await p.screenshot({path:O+'v2-perfil.png'});
await go(p,'/cali-work?w=fuerza1'); await p.screenshot({path:O+'v2-detalle-mapa-muscular.png'});
p=await ctxFor('m'); await go(p,'/cali-play?w=fuerza1'); await p.waitForTimeout(1200); await p.screenshot({path:O+'v2-reproductor.png'});
p=await ctxFor('f',1500); await go(p,'/gym?tab=plan'); await p.screenshot({path:O+'v2-plan-mujer.png'});
await go(p,'/cali-work?w=piernas_w'); await p.screenshot({path:O+'v2-detalle-mujer.png'});
p=await ctxFor('f'); await go(p,'/cali-play?w=core_w'); await p.waitForTimeout(1200); await p.screenshot({path:O+'v2-reproductor-mujer.png'});
await b.close(); console.log('errors',errs);
