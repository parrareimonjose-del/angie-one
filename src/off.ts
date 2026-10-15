// Open Food Facts (API pública y gratuita) — https://world.openfoodfacts.org
export type Product = { name: string; kcal100: number; p100: number; c100: number; f100: number; sugar100?: number; salt100?: number; sat100?: number; image?: string };
export async function lookupBarcode(code: string, lang = 'en', cc?: string): Promise<Product | null> {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_${lang},generic_name_${lang},nutriments,image_front_small_url&lc=${lang}${cc ? `&cc=${cc.toLowerCase()}` : ''}`);
  if (!r.ok) return null;
  const j = await r.json();
  if (j.status !== 1 || !j.product) return null;
  const n = j.product.nutriments || {};
  return { name: j.product[`product_name_${lang}`] || j.product.product_name || j.product[`generic_name_${lang}`] || code, kcal100: +n['energy-kcal_100g'] || 0, p100: +n.proteins_100g || 0, c100: +n.carbohydrates_100g || 0, f100: +n.fat_100g || 0,
    sugar100: n.sugars_100g, salt100: n.salt_100g, sat100: n['saturated-fat_100g'], image: j.product.image_front_small_url };
}
/** Semáforo (umbrales UK FSA por 100 g). */
export function light(kind: 'sugar' | 'salt' | 'sat', v?: number): 'green' | 'amber' | 'red' | 'na' {
  if (v == null || isNaN(+v)) return 'na';
  const t = { sugar: [5, 22.5], salt: [0.3, 1.5], sat: [1.5, 5] }[kind];
  return v <= t[0] ? 'green' : v <= t[1] ? 'amber' : 'red';
}
