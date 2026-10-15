/** Escáner de códigos de barras con la cámara en la web (iPhone Safari incluido).
 * Usa BarcodeDetector si el navegador lo trae; si no, @zxing/browser (gratis, sin servidor). */
import { createElement, useEffect, useRef } from 'react';
import { View } from 'react-native';

export default function WebScanner({ onCode, onError }: { onCode: (c: string) => void; onError: (e: 'denied' | 'nocam') => void }) {
  const vid = useRef<any>(null);
  useEffect(() => {
    let alive = true; let stream: MediaStream | null = null; let ctrl: any = null; let raf = 0;
    const done = (c: string) => { if (!alive) return; alive = false; onCode(c.replace(/\D/g, '')); };
    (async () => {
      const md: any = (navigator as any).mediaDevices;
      if (!md?.getUserMedia) { onError('nocam'); return; }
      const BD = (window as any).BarcodeDetector;
      try {
        if (BD) {
          stream = await md.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
          const v = vid.current; if (!v || !alive) return; v.srcObject = stream; await v.play().catch(() => {});
          const det = new BD({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
          const tick = async () => { if (!alive) return; try { const r = await det.detect(v); if (r?.[0]?.rawValue) return done(r[0].rawValue); } catch { /* sigue */ } raf = requestAnimationFrame(() => setTimeout(tick, 120)); };
          tick();
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const reader = new BrowserMultiFormatReader();
          ctrl = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, vid.current, (res: any) => { if (res) { ctrl?.stop(); done(res.getText()); } });
          if (!alive) ctrl?.stop();
        }
      } catch (e: any) { onError(e?.name === 'NotAllowedError' ? 'denied' : 'nocam'); }
    })();
    return () => { alive = false; cancelAnimationFrame(raf); try { ctrl?.stop(); } catch { /* nada */ } stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  return <View testID="web-scanner" style={{ height: 280, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000' }}>
    {createElement('video', { ref: vid, playsInline: true, muted: true, autoPlay: true, style: { width: '100%', height: '100%', objectFit: 'cover' } })}
    <View pointerEvents="none" style={{ position: 'absolute', left: '10%', right: '10%', top: '42%', height: 3, backgroundColor: '#FF5A5F' }} />
  </View>;
}
