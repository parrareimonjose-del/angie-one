// Base latina inicial (valores aproximados por porción indicada)
export type Food = { id: string; name: { es: string; en: string; pt: string }; portion: string; kcal: number; p: number; c: number; f: number };
const F = (id: string, es: string, en: string, pt: string, portion: string, kcal: number, p: number, c: number, f: number): Food => ({ id, name: { es, en, pt }, portion, kcal, p, c, f });
export const LATIN_FOODS: Food[] = [
  F('arepa', 'Arepa de maíz', 'Corn arepa', 'Arepa de milho', '1 u (100 g)', 220, 5, 42, 3),
  F('arepa_queso', 'Arepa con queso', 'Arepa with cheese', 'Arepa com queijo', '1 u', 330, 12, 43, 12),
  F('empanada', 'Empanada de carne (frita)', 'Beef empanada (fried)', 'Empanada de carne (frita)', '1 u', 290, 9, 27, 16),
  F('pabellon', 'Pabellón criollo', 'Pabellón criollo', 'Pabellón criollo', '1 plato', 750, 38, 85, 26),
  F('frijoles', 'Frijoles / caraotas negras', 'Black beans', 'Feijão preto', '1 taza (170 g)', 227, 15, 41, 1),
  F('arroz', 'Arroz blanco', 'White rice', 'Arroz branco', '1 taza (160 g)', 205, 4, 45, 0),
  F('platano', 'Plátano maduro frito', 'Fried sweet plantain', 'Banana-da-terra frita', '1 taza', 365, 2, 58, 15),
  F('tostones', 'Tostones / patacones', 'Tostones', 'Tostones', '6 u', 290, 1, 48, 11),
  F('tacos', 'Tacos al pastor', 'Tacos al pastor', 'Tacos al pastor', '3 u', 480, 27, 45, 21),
  F('tamal', 'Tamal / hallaca', 'Tamale', 'Pamonha / tamal', '1 u', 285, 11, 30, 14),
  F('gallo_pinto', 'Gallo pinto', 'Gallo pinto', 'Gallo pinto', '1 taza', 300, 10, 50, 7),
  F('ceviche', 'Ceviche de pescado', 'Fish ceviche', 'Ceviche de peixe', '1 taza', 200, 28, 12, 4),
  F('pupusa', 'Pupusa revuelta', 'Pupusa', 'Pupusa', '1 u', 300, 11, 33, 13),
  F('bandeja', 'Bandeja paisa', 'Bandeja paisa', 'Bandeja paisa', '1 plato', 1350, 60, 120, 70),
  F('feijoada', 'Feijoada', 'Feijoada', 'Feijoada', '1 plato', 650, 38, 50, 32),
  F('pao_queijo', 'Pan de queso', 'Cheese bread', 'Pão de queijo', '3 u', 260, 7, 30, 12),
  F('aguacate', 'Aguacate', 'Avocado', 'Abacate', '1/2 u', 120, 1.5, 6, 11),
  F('mango', 'Mango', 'Mango', 'Manga', '1 u', 200, 3, 50, 1),
  F('huevo', 'Huevos revueltos', 'Scrambled eggs', 'Ovos mexidos', '2 u', 180, 12, 2, 14),
  F('pollo', 'Pollo a la plancha', 'Grilled chicken', 'Frango grelhado', '150 g', 250, 46, 0, 6),
  F('yuca', 'Yuca hervida', 'Boiled cassava', 'Mandioca cozida', '1 taza', 210, 2, 50, 0),
  F('cafe', 'Café con leche', 'Coffee with milk', 'Café com leite', '1 taza', 90, 5, 8, 4),
];
