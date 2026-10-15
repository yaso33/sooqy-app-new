export type DeliveryType = "home" | "desk";

/** رسوم التوصيل حسب الولاية — نفس المنطق السابق، منقول للاستخدام المشترك بين السلة والدفع */
export function getShippingFee(wilayaId: number, deliveryType: DeliveryType) {
  if (deliveryType === "desk") return 0;
  const base = { 1: 800, 2: 900 } as Record<number, number>;
  const amount = base[wilayaId] ?? 700;
  return amount + 100;
}