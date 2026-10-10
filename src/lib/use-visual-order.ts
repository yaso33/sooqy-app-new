import { useEffect, useState } from "react";
import { orderByVisual, type VisualProfile } from "./image-rank";

/** يرتّب المنتجات بحسب التشابه البصري مع صورة المستخدم.
 *  يعيد القائمة كما هي إذا لم تُختر صورة أو لم تكتمل المقارنة بعد،
 *  فلا تختفي النتائج ولا تهتز الواجهة أثناء التحليل. */
export function useVisualOrder<T extends { product: { id: string }; image?: string | null }>(
  query: VisualProfile | null,
  items: T[],
): T[] {
  const [ranked, setRanked] = useState<T[] | null>(null);

  useEffect(() => {
    if (!query) {
      setRanked(null);
      return;
    }
    let alive = true;
    void orderByVisual(query, items).then((next) => {
      if (alive) setRanked(next);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, items]);

  return ranked ?? items;
}