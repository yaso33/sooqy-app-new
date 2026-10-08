import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Store, Trash2 } from "lucide-react";
import { useBag } from "@/lib/bag";
import { formatDA } from "@/lib/geo";
import { getOffersByIds, primaryImage } from "@/lib/sooqy";
import { getShippingFee } from "@/lib/shipping";
import { QtyStepper } from "@/components/sooqy/qty-stepper";
import { EmptyState } from "@/components/sooqy/empty-state";

export const Route = createFileRoute("/bag")({
  head: () => ({
    meta: [
      { title: "سلة التسوق — SooQy" },
      { name: "description", content: "راجع منتجاتك المختارة قبل إتمام الطلب والتوصيل." },
    ],
  }),
  component: BagPage,
});

function BagPage() {
  const bag = useBag();
  const ids = bag.items.map((i) => i.offerId);
  const offers = useQuery({ queryKey: ["bag-offers", ids], queryFn: () => getOffersByIds(ids) });
  const rows = bag.items.map((i) => ({ ...i, offer: offers.data?.find((o) => o.id === i.offerId) }));

  // التجميع حسب المتجر
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.offer?.store.name ?? "متجر آخر";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const subtotal = rows.reduce((s, r) => s + (r.offer?.price ?? 0) * r.quantity, 0);
  let wilayaId: number | null = null;
  try {
    const w = localStorage.getItem("sooqy:wilaya");
    if (w) wilayaId = Number(w);
  } catch {
    /* تجاهل */
  }
  const delivery = wilayaId ? getShippingFee(wilayaId, "home") : null;
  const total = subtotal + (delivery ?? 0);

  return (
    <div className="space-y-4 px-4 pb-44 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">سلة التسوق</h1>
        {bag.items.length > 0 && (
          <button
            onClick={() => confirm("هل تريد إفراغ السلة؟") && bag.clear()}
            className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-danger"
          >
            <Trash2 className="size-3.5" /> إفراغ السلة
          </button>
        )}
      </div>

      {bag.items.length === 0 && (
        <EmptyState
          icon="🛒"
          title="سلتك فارغة"
          hint="أضف منتجات من المتاجر القريبة منك وارجع لإتمام الطلب."
          action={
            <Link
              to="/explore"
              className="btn-primary"
            >
              تصفح المنتجات
            </Link>
          }
        />
      )}

      {/* المجموعات حسب المتجر */}
      {[...groups.entries()].map(([storeName, items]) => (
        <section key={storeName} className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
            <Store className="size-4 text-primary" />
            {storeName}
          </h2>
          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.offerId} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                {r.offer ? (
                  <Link
                    to="/products/$productId"
                    params={{ productId: r.offer.product_id }}
                    className="size-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100"
                  >
                    {primaryImage(r.offer.images) && (
                      <img src={primaryImage(r.offer.images)!} alt="" className="size-full object-cover" />
                    )}
                  </Link>
                ) : (
                  <div className="size-20 shrink-0 animate-pulse rounded-xl bg-muted" />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-1 text-sm font-semibold">{r.offer?.product.name ?? "..."}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.offer?.store.name} {Object.values(r.options).join(" · ")}
                  </p>
                  <p key={r.quantity} className="animate-pop text-price text-ink">
                    {formatDA((r.offer?.price ?? 0) * r.quantity)}
                  </p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button
                    aria-label="حذف من السلة"
                    onClick={() => bag.remove(r.offerId)}
                    className="transition hover:scale-110 active:scale-95"
                  >
                    <Trash2 className="size-4 text-danger" />
                  </button>
                  <QtyStepper
                    value={r.quantity}
                    onChange={(v) => bag.setQty(r.offerId, v)}
                    max={r.offer?.stock_quantity ?? 10}
                    className="scale-90 origin-bottom-left"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {bag.items.length > 0 && (
        <Link to="/explore" className="block text-center text-sm font-bold text-primary">
          + مواصلة التسوق
        </Link>
      )}

      {/* ملخص الطلب */}
      {bag.items.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <b className="text-foreground">{formatDA(subtotal)}</b>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">التوصيل</span>
            {delivery != null ? (
              <b className="text-foreground">{formatDA(delivery)}</b>
            ) : (
              <span className="text-xs text-muted-foreground">يُحدد بعد اختيار الولاية</span>
            )}
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-bold text-foreground">الإجمالي</span>
            <b className="text-price text-primary">{formatDA(total)}</b>
          </div>
        </div>
      )}

      {/* شريط متابعة الطلب */}
      {bag.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4">
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card/95 p-3 shadow-lift backdrop-blur">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-muted-foreground">
                الإجمالي ({bag.count} منتج)
              </span>
              <b className="text-h3 text-primary">{formatDA(total)}</b>
            </div>
            <Link
              to="/checkout"
              className="btn-primary mt-3 w-full"
            >
              متابعة الطلب <ArrowLeft className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}