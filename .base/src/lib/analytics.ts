/**
 * تحليلات محلية خفيفة بدون أي خدمة خارجية.
 * تُخزَّن الأحداث في localStorage (آخر 200 حدث) ويمكن تصديرها لاحقًا
 * إلى أي مزوّد تحليلات عند الحاجة.
 */
export type AnalyticsEvent =
  | "view_product"
  | "add_to_bag"
  | "begin_checkout"
  | "place_order"
  | "search";

export function track(event: AnalyticsEvent, data?: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem("sooqy:events") ?? "[]";
    const list = JSON.parse(raw) as unknown[];
    list.push({ event, data, at: new Date().toISOString() });
    localStorage.setItem("sooqy:events", JSON.stringify(list.slice(-200)));
    if (import.meta.env.DEV) console.debug("[analytics]", event, data);
  } catch {
    // localStorage غير متاح (وضع خاص) — نتجاهل بصمت
  }
}