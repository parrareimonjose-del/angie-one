import { chromium } from 'playwright-core';
const BASE='http://localhost:8797/angie-one', O='/workspace/calorias/calistenia-capturas/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errs=[];
async function ctxFor(sex){
  const ctx = await b.newContext({ viewport: { width: 420, height: 880 }, locale: 'es-ES' });
  const st = { aiEnabled: true, entries: [], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: 'es', trialStart: Date.now()-3600e3, profile: { goal:'lose', weight:82, height:168, age:45, sex:'female', activity:2 }, ext: { cali: { sex, tone: sex==='m'?1:0, fav:['pullup'], done:['pushup'], best:{}, log:[], lvl:1 } } };
  await ctx.addInitScript((s)=>{localStorage.setItem('angieone:v1',JSON.stringify(s));sessionStorage.setItem('angie:splash','1');}, st);
  const p = await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e))); return p;
}
const go=async(p,r)=>{await p.goto(BASE+r+(r.includes('?')?'&':'?')+'nosplash=1',{waitUntil:'networkidle'});await p.waitForTimeout(1200);};
let p=await ctxFor('f');
await go(p,'/gym'); await p.screenshot({path:O+'1-biblioteca.png'});
await p.getByText('🌳 Progresiones',{exact:true}).first().click(); await p.waitForTimeout(800); await p.setViewportSize({width:420,height:1900}); await p.waitForTimeout(600); await p.screenshot({path:O+'4-arbol-progresiones.png'}); await p.setViewportSize({width:420,height:880});
await go(p,'/cali-ex?id=pullup'); await p.screenshot({path:O+'3-detalle-mujer.png'});
await go(p,'/cali-play?prog=start&day=0'); await p.waitForTimeout(1500); await p.screenshot({path:O+'5-reproductor.png'});
p=await ctxFor('m'); await go(p,'/cali-ex?id=pullup'); await p.screenshot({path:O+'2-detalle-hombre.png'});
await b.close(); console.log('errors',errs);
