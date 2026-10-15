/**
 * Voz robusta para la web:
 * 1) Web Speech API (Chrome/Android, Safari si está activado Siri/dictado).
 * 2) Si no existe o falla (iPhone sin permiso, apps internas, Firefox): graba audio con MediaRecorder
 *    (mp4/aac en iOS, webm/opus en otros) y el Worker lo transcribe con Gemini. No se guarda el audio.
 */
import { Platform } from 'react-native';
import { AI_URL } from './ai';
import { fmtLocale } from './i18n';

export type VoiceErr = 'noMic' | 'denied' | 'noSpeech' | 'busy' | 'offline';
const W: any = typeof window !== 'undefined' ? window : {};
const SRClass = () => (Platform.OS === 'web' ? W.SpeechRecognition || W.webkitSpeechRecognition : null);
const hasMR = () => typeof W.MediaRecorder !== 'undefined';
const hasAC = () => !!(W.AudioContext || W.webkitAudioContext);
const canRecord = () => Platform.OS === 'web' && !!W.navigator?.mediaDevices?.getUserMedia && (hasMR() || hasAC());

/** Respaldo sin MediaRecorder (iOS antiguos): captura PCM con Web Audio y lo empaqueta como WAV 16 kHz mono. */
function pcmRecorder(stream: MediaStream) {
  const AC = W.AudioContext || W.webkitAudioContext; const ac = new AC(); const src = ac.createMediaStreamSource(stream);
  const node = ac.createScriptProcessor(4096, 1, 1); const bufs: Float32Array[] = [];
  node.onaudioprocess = (e: any) => bufs.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(node); node.connect(ac.destination);
  return { stop(): Blob {
    try { node.disconnect(); src.disconnect(); ac.close(); } catch { /* nada */ }
    const rate = ac.sampleRate, out = 16000, ratio = rate / out; const len = bufs.reduce((a, b) => a + b.length, 0); const all = new Float32Array(len); let o = 0; for (const b of bufs) { all.set(b, o); o += b.length; }
    const n = Math.floor(len / ratio); const dv = new DataView(new ArrayBuffer(44 + n * 2)); const ws = (off: number, t: string) => { for (let i = 0; i < t.length; i++) dv.setUint8(off + i, t.charCodeAt(i)); };
    ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, out, true); dv.setUint32(28, out * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, all[Math.floor(i * ratio)])); dv.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
    return new Blob([dv.buffer], { type: 'audio/wav' });
  } };
}
export const voiceSupported = () => !!SRClass() || canRecord();

function pickMime() {
  const MR = W.MediaRecorder; const list = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  for (const m of list) { try { if (MR.isTypeSupported?.(m)) return m; } catch { /* nada */ } }
  return '';
}
const toB64 = (blob: Blob) => new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = ko; r.readAsDataURL(blob); });

export async function transcribe(blob: Blob, mime: string): Promise<string> {
  const audio = await toB64(blob);
  let r: Response;
  try { r = await fetch(AI_URL.replace(/\/estimate$/, '/voice'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio, mime, lang: fmtLocale() }) }); }
  catch { throw new Error('offline'); }
  const o = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(o.error === 'no_speech' ? 'noSpeech' : o.error === 'busy' ? 'busy' : 'busy');
  return String(o.text || '');
}

/** Empieza a escuchar. Devuelve una función para parar (tocar otra vez). Máx. 15 s grabando. */
export function startVoice(h: { onText: (t: string) => void; onErr: (e: VoiceErr) => void; onState: (s: 'idle' | 'listening' | 'working') => void }): () => void {
  let stopped = false; let stopFn = () => {};
  const record = async () => {
    if (!canRecord()) { h.onErr('noMic'); h.onState('idle'); return; }
    let stream: MediaStream;
    try { stream = await W.navigator.mediaDevices.getUserMedia({ audio: true }); } catch { h.onErr('denied'); h.onState('idle'); return; }
    const finish = async (blob: Blob, type: string) => {
      stream.getTracks().forEach((t) => t.stop()); clearTimeout(tm);
      if (blob.size < 1500) { h.onErr('noSpeech'); h.onState('idle'); return; }
      h.onState('working');
      try { const t = await transcribe(blob, type); if (t.trim()) h.onText(t); else h.onErr('noSpeech'); }
      catch (e: any) { h.onErr(e?.message === 'offline' ? 'offline' : e?.message === 'noSpeech' ? 'noSpeech' : 'busy'); }
      finally { h.onState('idle'); }
    };
    let tm: any;
    if (hasMR()) {
      const mime = pickMime(); const rec = new W.MediaRecorder(stream, mime ? { mimeType: mime } : undefined); const chunks: Blob[] = [];
      rec.ondataavailable = (e: any) => e.data?.size && chunks.push(e.data);
      rec.onstop = () => { const type = (rec.mimeType || mime || 'audio/mp4').split(';')[0]; finish(new Blob(chunks, { type }), type); };
      rec.start(); stopFn = () => rec.state !== 'inactive' && rec.stop();
    } else {
      const pr = pcmRecorder(stream); let done = false;
      stopFn = () => { if (done) return; done = true; finish(pr.stop(), 'audio/wav'); };
    }
    h.onState('listening');
    tm = setTimeout(() => stopFn(), 15000);
    if (stopped) stopFn();
  };
  const ios = /iPhone|iPad|iPod/.test(W.navigator?.userAgent || '') || (W.navigator?.platform === 'MacIntel' && W.navigator?.maxTouchPoints > 1);
  const SR = ios && canRecord() ? null : SRClass();
  if (SR) {
    let got = false, fellBack = false;
    try {
      const r = new SR(); r.lang = fmtLocale(); r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e: any) => { got = true; h.onText(e.results[0][0].transcript); };
      r.onerror = (e: any) => { if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'language-not-supported'].includes(e?.error) && !fellBack) { fellBack = true; record(); } else if (e?.error === 'no-speech') h.onErr('noSpeech'); };
      r.onend = () => { if (!got && !fellBack) h.onState('idle'); else if (got) h.onState('idle'); };
      r.start(); h.onState('listening'); stopFn = () => { try { r.stop(); } catch { /* nada */ } };
    } catch { fellBack = true; record(); }
  } else record();
  return () => { stopped = true; stopFn(); };
}
