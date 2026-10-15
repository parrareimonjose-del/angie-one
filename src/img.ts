import { Platform } from 'react-native';
/** En la web reduce fotos grandes (máx. 1280 px, JPEG 0,7) para que viajen rápido y no pasen el límite del servidor. */
export async function shrinkForUpload(uri: string, b64: string, mime: string): Promise<{ b64: string; mime: string }> {
  if (Platform.OS !== 'web' || b64.length < 900_000) return { b64, mime };
  try {
    const img: HTMLImageElement = await new Promise((ok, bad) => { const i = new (window as any).Image(); i.onload = () => ok(i); i.onerror = bad; i.src = uri; });
    const k = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return { b64: c.toDataURL('image/jpeg', 0.7).split(',')[1], mime: 'image/jpeg' };
  } catch { return { b64, mime }; }
}
