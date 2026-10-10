import { rankByVisual, type VisualProfile } from "./image-search";

export type { VisualProfile };

/** يرتّب المنتجات بحسب التشابه البصري مع صورة المستخدم، دون تعديل بياناتها */
export function orderByVisual<T extends { product: { id: string }; image?: string | null }>(
  query: VisualProfile | null,
  items: T[],
): Promise<T[]> {
  if (!query) return Promise.resolve(items);
  return rankByVisual(query, items.map((g) => ({ id: g.product.id, url: g.image ?? null }))).then(
    (ranked) => {
      const score = new Map(ranked.map((r) => [r.id, r.score]));
      return [...items].sort((a, b) => (score.get(b.product.id) ?? 0) - (score.get(a.product.id) ?? 0));
    },
  );
}