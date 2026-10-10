import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  ShoppingBag,
  Star,
  Timer,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { formatDA, formatKm, useGeo, isOpenNow } from "@/lib/geo";
import {
  createReservation,
  getProduct,
  getProductComparisonOffers,
  incrementProductView,
  primaryImage,
  searchProducts,
  stockLevel,
  storeDistance,
  type OfferFull,
  type Reservation,
} from "@/lib/sooqy";
import { useAuth } from "@/lib/auth";
import { useBag } from "@/lib/bag";
import { track } from "@/lib/analytics";
import { StockBadge, OpenBadge, VerifiedBadge } from "@/components/sooqy/badges";
import { Carousel } from "@/components/sooqy/carousel";
import { QtyStepper } from "@/components/sooqy/qty-stepper";
import { FavoriteButton, ProductCard } from "@/components/sooqy/cards";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCountdown } from "@/components/sooqy/DynamicIsland";
import { ReviewSection } from "@/components/sooqy/ReviewSection";
import { DirectionsButton } from "@/components/sooqy/DirectionsButton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const Route = createFileRoute("/products/$productId")({
  head: () => ({
    meta: [
      { title: "تفاصيل المنتج وأماكن توفره — SOOQY" },
      {
        name: "description",
        content: "قارن أسعار هذا المنتج في المحلات القريبة واحجزه واستلمه من المحل.",
      },
      { property: "og:title", content: "شاهد أين تتوفر هذه السلعة — SOOQY" },
      { property: "og:description", content: "مقارنة الأسعار والمخزون في المحلات الجزائرية." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { productId } = Route.useParams();
  const { pos } = useGeo();
  const { user } = useAuth();
  const bag = useBag();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();

  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId),
  });
  const offers = useQuery({
    queryKey: ["offers", productId],
    queryFn: () => getProductComparisonOffers(productId),
  });
  const similar = useQuery({
    queryKey: ["similar", productId, product.data?.category],
    queryFn: () => searchProducts({ category: product.data?.category ?? null, limit: 8, pos }),
    enabled: !!product.data,
  });

  const sorted = useMemo(
    () =>
      (offers.data ?? [])
        .map((o) => ({ ...o, distance: storeDistance(o.store, pos) }))
        .sort(
          (a, b) =>
            Number(stockLevel(b) !== "out") - Number(stockLevel(a) !== "out") || a.price - b.price,
        ),
    [offers.data, pos],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sorted.find((o) => o.id === selectedId) ?? sorted[0];
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [bagPulse, setBagPulse] = useState(0);

  const opts = (selected?.options ?? {}) as { sizes?: string[]; colors?: string[] };

  useEffect(() => {
    track("view_product", { productId });
    incrementProductView(productId).catch(() => {});
  }, [productId]);
  useEffect(() => {
    setSize(opts.sizes?.[0] ?? "");
    setColor(opts.colors?.[0] ?? "");
    setImgIdx(0);
    setQty(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const images = useMemo(() => {
    const all = sorted.flatMap((o) => o.images.map((i) => i.image_url));
    const first = primaryImage(selected?.images);
    return [...new Set([first, ...all].filter(Boolean) as string[])];
  }, [sorted, selected]);

  if (product.isLoading || offers.isLoading)
    return <div className="m-4 h-96 animate-pulse rounded-3xl bg-card" />;
  if (!product.data)
    return (
      <div className="p-8 text-center">
        <p className="mb-4">المنتج غير موجود</p>
        <Link to="/explore" className="font-bold text-primary">
          رجوع للبحث
        </Link>
      </div>
    );

  const p = product.data;
  const chosen: Record<string, string> = {};
  if (size) chosen["المقاس"] = size;
  if (color) chosen["اللون"] = color;
  const level = selected ? stockLevel(selected) : "out";

  const share = async () => {
    const url = window.location.href;
    const text = `شاهد ${p.name} في SOOQY 🇩🇿 ابتداءً من ${formatDA(sorted[0]?.price ?? 0)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.name, text, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("تم نسخ الرابط");
    }
  };

  const reserve = async (o: OfferFull) => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    setBusy(true);
    try {
      const r = await createReservation(o.id, o.store_id, 3, qty, chosen);
      setReservation(r);
      qc.invalidateQueries({ queryKey: ["offers", productId] });
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addToBag = () => {
    if (!selected) return;
    bag.add({ offerId: selected.id, quantity: qty, options: chosen });
    setBagPulse((n) => n + 1);
    track("add_to_bag", { offerId: selected.id, quantity: qty, price: selected.price });
    toast.success("أُضيف إلى السلة 🛒");
  };

  const waText = (o: OfferFull) =>
    encodeURIComponent(
      `السلام عليكم، رأيت "${p.name}" في SOOQY بسعر ${formatDA(o.price)}.${size ? ` المقاس: ${size}.` : ""}${color ? ` اللون: ${color}.` : ""} هل ما زال متوفراً؟`,
    );

  return (
    <div className="pb-6">
      <div className="relative bg-neutral-100 dark:bg-neutral-800">
        <Carousel slideClassName="basis-full" onIndexChange={setImgIdx}>
          {(images.length ? images : [null]).map((src, i) =>
            src ? (
              <button
                key={src}
                onClick={() => setZoomSrc(src)}
                aria-label={`تكبير صورة ${i + 1}`}
                className="block w-full"
              >
                <img
                  src={src}
                  alt={`${p.name} — صورة ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
              </button>
            ) : (
              <div
                key="none"
                className="flex aspect-square w-full items-center justify-center text-6xl"
              >
                🛍️
              </div>
            ),
          )}
        </Carousel>
        <button
          onClick={() => router.history.back()}
          aria-label="رجوع"
          className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-card/90 shadow-soft backdrop-blur transition active:scale-95"
        >
          <ArrowRight className="size-5" />
        </button>
        <button
          onClick={share}
          aria-label="مشاركة"
          className="absolute top-4 left-4 z-10 flex size-10 items-center justify-center rounded-full bg-card/90 shadow-soft backdrop-blur transition active:scale-95"
        >
          <Share2 className="size-5" />
        </button>
        <div className="absolute top-16 left-4 z-10">
          <FavoriteButton kind="products" id={p.id} />
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center">
            <span className="rounded-full bg-ink/70 px-3 py-1 text-[11px] font-bold text-ink-foreground backdrop-blur">
              {imgIdx + 1} / {images.length}
            </span>
          </div>
        )}
      </div>

      <div className="-mt-6 space-y-5 rounded-t-3xl bg-background px-4 pt-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {p.brand && (
              <span className="text-xs font-semibold text-muted-foreground">{p.brand}</span>
            )}
            <StockBadge level={level} />
          </div>
          <h1 className="text-2xl font-bold">{p.name}</h1>
          {sorted.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="size-3.5 fill-warning text-warning" />
              <span className="text-sm font-bold text-foreground">
                {Math.max(...sorted.map((o) => Number(o.store.rating) || 0)).toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">· تقييم المتاجر المتوفرة</span>
            </div>
          )}
          {selected && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{formatDA(selected.price)}</span>
              {selected.old_price && selected.old_price > selected.price && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatDA(selected.old_price)}
                </span>
              )}
            </div>
          )}
          {sorted.length > 1 && (
            <p className="text-xs text-muted-foreground">
              متوفر في {sorted.length} محل — من {formatDA(sorted[0]!.price)} إلى{" "}
              {formatDA(sorted[sorted.length - 1]!.price)}
            </p>
          )}
          {selected && (
            <p className="text-[11px] text-muted-foreground">
              آخر تأكيد للمخزون:{" "}
              {selected.last_confirmed_at
                ? formatDistanceToNow(new Date(selected.last_confirmed_at), {
                    addSuffix: true,
                    locale: ar,
                  })
                : "لم يُؤكَّد بعد"}{" "}
              · {selected.store.name}
            </p>
          )}
          {p.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>
          )}
        </div>

        {opts.sizes?.length ? (
          <OptionRow label="المقاس" values={opts.sizes} value={size} onChange={setSize} />
        ) : null}
        {opts.colors?.length ? (
          <OptionRow label="اللون" values={opts.colors} value={color} onChange={setColor} />
        ) : null}

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">الكمية</span>
          <QtyStepper
            value={qty}
            onChange={setQty}
            max={Math.min(selected?.stock_quantity ?? 10, 10)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={!selected || level === "out" || busy}
            onClick={() => selected && reserve(selected)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-40"
          >
            <Timer className="size-4" /> احجز واستلم
          </button>
          <button
            disabled={!selected || level === "out"}
            onClick={addToBag}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 font-bold text-ink-foreground disabled:opacity-40"
          >
            <ShoppingBag key={bagPulse} className="size-4 animate-pop" /> توصيل إلى المنزل
          </button>
        </div>

        <ReviewSection targetType="product" targetId={p.id} title="تقييمات المنتج" />

        <section className="space-y-3">
          <h2 className="text-lg font-bold">أين تجده؟ 📍</h2>
          {sorted.map((o) => {
            const lv = stockLevel(o);
            return (
              <div
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={cn(
                  "cursor-pointer space-y-3 rounded-2xl border-2 bg-card p-3 shadow-soft transition",
                  selected?.id === o.id ? "border-primary" : "border-transparent",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <Link
                      to="/stores/$storeId"
                      params={{ storeId: o.store_id }}
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold"
                    >
                      {o.store.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <OpenBadge open={isOpenNow(o.store.opening_hours)} />
                      {o.store.is_verified && <VerifiedBadge />}
                      {o.distance != null && (
                        <span className="font-semibold text-ink">{formatKm(o.distance)}</span>
                      )}
                      {o.store.commune && <span>{o.store.commune}</span>}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold">{formatDA(o.price)}</p>
                    <StockBadge level={lv} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`tel:${o.store.phone ?? ""}`}
                    className="flex items-center justify-center gap-1 rounded-xl bg-muted py-2 text-xs font-semibold"
                  >
                    <Phone className="size-3.5" /> اتصال
                  </a>
                  <a
                    href={`https://wa.me/${(o.store.whatsapp ?? "").replace(/\D/g, "")}?text=${waText(o)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 rounded-xl bg-success/12 py-2 text-xs font-semibold text-success"
                  >
                    <MessageCircle className="size-3.5" /> واتساب
                  </a>
                  <DirectionsButton
                    lat={o.store.latitude}
                    lng={o.store.longitude}
                    label={o.store.name}
                    className="flex items-center justify-center gap-1 rounded-xl bg-ink py-2 text-xs font-semibold text-ink-foreground"
                  >
                    <Navigation className="size-3.5" /> الاتجاهات
                  </DirectionsButton>
                </div>
              </div>
            );
          })}
        </section>

        {similar.data && similar.data.filter((g) => g.product.id !== p.id).length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">منتجات مشابهة</h2>
            <div className="grid grid-cols-2 gap-3">
              {similar.data
                .filter((g) => g.product.id !== p.id)
                .slice(0, 6)
                .map((g) => (
                  <ProductCard key={g.product.id} g={g} />
                ))}
            </div>
          </section>
        )}
      </div>

      {/* شريط الشراء الثابت */}
      {selected && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-3xl border border-border/50 bg-card/95 p-3 shadow-float backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">الإجمالي</p>
              <p className="text-lg font-bold text-primary">
                {formatDA(selected.price * qty)}
                {qty > 1 && (
                  <span className="text-xs font-medium text-muted-foreground"> × {qty}</span>
                )}
              </p>
            </div>
            <button
              disabled={level === "out" || busy}
              onClick={addToBag}
              className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground transition disabled:opacity-40 active:scale-[0.98]"
            >
              <ShoppingBag className="size-4" /> أضف إلى السلة
            </button>
            <button
              disabled={level === "out"}
              onClick={() => {
                addToBag();
                navigate({ to: "/bag" });
              }}
              className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-ink px-4 text-sm font-bold text-ink-foreground transition disabled:opacity-40 active:scale-[0.98]"
            >
              <Zap className="size-4" /> اشترِ الآن
            </button>
          </div>
        </div>
      )}

      <ReservationDialog
        reservation={reservation}
        storeName={selected?.store.name ?? ""}
        productName={p.name}
        onClose={() => setReservation(null)}
      />

      <Dialog open={!!zoomSrc} onOpenChange={(o) => !o && setZoomSrc(null)}>
        <DialogContent dir="rtl" className="max-w-full border-0 bg-black/90 p-0 sm:max-w-lg">
          {zoomSrc && (
            <img src={zoomSrc} alt={p.name} className="max-h-[85vh] w-full object-contain" />
          )}
          <button
            onClick={() => setZoomSrc(null)}
            className="absolute top-3 left-3 flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OptionRow({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "min-w-11 rounded-xl border px-3 py-2 text-sm font-semibold",
              v === value ? "border-ink bg-ink text-ink-foreground" : "bg-card",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReservationDialog({
  reservation,
  storeName,
  productName,
  onClose,
}: {
  reservation: Reservation | null;
  storeName: string;
  productName: string;
  onClose: () => void;
}) {
  const cd = useCountdown(reservation?.expires_at ?? null);
  return (
    <Dialog open={!!reservation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center">تم الحجز ✅</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {productName} محجوز لك في <b className="text-foreground">{storeName}</b>
          </p>
          <div className="rounded-2xl bg-ink py-5 text-ink-foreground">
            <p className="text-xs opacity-70">كود الاستلام</p>
            <p className="font-mono text-4xl font-bold tracking-widest text-primary">
              {reservation?.code}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Timer className="size-4 text-warning" /> الاستلام خلال{" "}
            <span className="font-mono font-bold">{cd?.label}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            أظهر هذا الكود للتاجر وقت الاستلام. يمكنك العثور عليه في حسابي.
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground"
          >
            حسنًا
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
