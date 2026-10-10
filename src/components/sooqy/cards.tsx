import { Link } from "@tanstack/react-router";
import { MapPin, Navigation, ImageOff } from "lucide-react";
import { formatDA, formatKm, getStoreStatus } from "@/lib/geo";
import type { ProductGroup, Store } from "@/lib/sooqy";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { OpenBadge, VerifiedBadge } from "./badges";
import { DirectionsButton } from "./DirectionsButton";
import { RatingStars } from "./rating-stars";
import { cn } from "@/lib/utils";

/** صورة افتراضية للمنتجات عند غياب الصورة */
const PRODUCT_PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNlMmU4ZjAiLz48cGF0aCBkPSJNODAgNzVsMjAgMjAgMzAtMzAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=";

/** صورة افتراضية للمتاجر عند غياب الصورة */
const STORE_PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNlMmU4ZjAiLz48cGF0aCBkPSJNMTAwIDUwYzI3LjYgMCA1MCAyMi40IDUwIDUwcy0yMi40IDUwLTUwIDUwLTUwLTIyLjQtNTAtNTBTNzIuNCA1MCAxMDAgNTB6bTAgMTgwYzcyLjYgMCAxMzAtNTkuNCAxMzAtMTMwUzE3Mi42IDUwIDEwMCA1MHoiIHN0cm9rZT0iIzYzNjZmMSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9zdmc+";

/** زر المفضلة (قلب) — يحفظ المعرف محليًا */
export function FavoriteButton({
  kind,
  id,
  className,
  size = "size-4",
}: {
  kind: "products" | "stores";
  id: string;
  className?: string;
  size?: string;
}) {
  const active = isFavorite(kind, id);
  return (
    <button
      type="button"
      aria-label={active ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(kind, id);
      }}
      className={cn(
        "flex size-9 items-center justify-center rounded-full border border-border bg-card/95 backdrop-blur transition active:scale-90",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(size, "transition-colors", active ? "fill-primary text-primary" : "fill-transparent text-muted-foreground")}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}

export function ProductCard({ g }: { g: ProductGroup }) {
  const level = g.available ? (g.totalStock <= 3 ? "low" : "in") : "out";
  const rating = g.offers.length
    ? Math.max(...g.offers.map((o) => Number(o.store.rating) || 0))
    : 0;
  const best = g.offers.length ? g.offers.reduce((a, b) => (a.price <= b.price ? a : b)) : undefined;
  const discountPct = Math.max(
    0,
    ...g.offers.map((o) =>
      o.old_price && o.old_price > o.price ? Math.round(((o.old_price - o.price) / o.old_price) * 100) : 0,
    ),
  );
  const discount = discountPct > 0;

  return (
    <Link
      to="/products/$productId"
      params={{ productId: g.product.id }}
      preload="intent"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-200 hover:shadow-soft"
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {g.image ? (
          <img
            src={g.image}
            alt={g.product.name}
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.src = PRODUCT_PLACEHOLDER; }}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <img
            src={PRODUCT_PLACEHOLDER}
            alt={g.product.name}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        )}
        <FavoriteButton kind="products" id={g.product.id} className="absolute top-2 right-2" />
        {discount && (
          <span className="absolute bottom-2 right-2 rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">
            -{discountPct}%
          </span>
        )}
        {level === "out" && (
          <span className="absolute inset-0 flex items-center justify-center bg-card/60 text-sm font-bold text-danger backdrop-blur-[1px]">
            نفد من المخزون
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 text-sm font-semibold">{g.product.name}</p>
        <div className="flex items-center gap-1">
          <RatingStars rating={rating} size="size-3" showValue />
        </div>
        <p className="text-price text-ink">{formatDA(g.minPrice)}</p>
        <p className="line-clamp-1 text-[11px] font-medium text-muted-foreground">
          {best?.store.name ?? "متاجر متعددة"}
        </p>
      </div>
    </Link>
  );
}

export function StoreCard({ s, distance }: { s: Store; distance?: number | null }) {
  const status = getStoreStatus(s.opening_hours);
  return (
    <Link
      to="/stores/$storeId"
      params={{ storeId: s.id }}
      preload="intent"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-200 hover:shadow-soft"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {(s.cover_url || s.logo_url) ? (
          <img
            src={s.cover_url || s.logo_url!}
            alt={s.name}
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.src = STORE_PLACEHOLDER; }}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <img
            src={STORE_PLACEHOLDER}
            alt={s.name}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        )}
        <OpenBadge status={status} detailed className="absolute top-2 right-2 bg-card/95 backdrop-blur" />
        <FavoriteButton kind="stores" id={s.id} className="absolute bottom-2 right-2" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 font-bold">{s.name}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1">
            <RatingStars rating={Number(s.rating)} size="size-3" showValue />
          </span>
          {distance != null && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-ink">
              <MapPin className="size-3 text-muted-foreground" />
              {formatKm(distance)}
            </span>
          )}
        </div>
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {s.commune && <span className="line-clamp-1">{s.commune}</span>}
          {s.is_verified && <VerifiedBadge />}
        </p>
      </div>
    </Link>
  );
}

/** بطاقة متجر مصغّرة (تُستخدم في صفحات المنتج والدفع) */
export function StoreMiniCard({ s, distance }: { s: Store; distance?: number | null }) {
  const status = getStoreStatus(s.opening_hours);
  return (
    <Link
      to="/stores/$storeId"
      params={{ storeId: s.id }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:shadow-soft"
    >
      <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
        {(s.logo_url || s.cover_url) ? (
          <img
            src={s.logo_url || s.cover_url!}
            alt={s.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.src = STORE_PLACEHOLDER; }}
            className="size-full object-cover"
          />
        ) : (
          <img src={STORE_PLACEHOLDER} alt={s.name} loading="lazy" className="size-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block line-clamp-1 text-sm font-bold">{s.name}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <RatingStars rating={Number(s.rating)} size="size-3" showValue />
          {distance != null && <span>{formatKm(distance)}</span>}
          <OpenBadge status={status} detailed />
        </span>
      </span>
      <DirectionsButton
        lat={s.latitude}
        lng={s.longitude}
        label={s.name}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
      >
        <Navigation className="size-4" />
      </DirectionsButton>
    </Link>
  );
}

/** بطاقة عرض (عرض متجر) للصفحة الرئيسية */
export function OfferCard({ offer }: { offer: OfferFull }) {
  const { product, store, images } = offer;
  const discountPct = offer.old_price && offer.old_price > offer.price
    ? Math.round(((offer.old_price - offer.price) / offer.old_price) * 100)
    : 0;
  const discount = discountPct > 0;
  const rating = Number(store.rating) || 0;
  const status = getStoreStatus(store.opening_hours);
  const img = images?.length ? images[0].image_url : null;

  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      preload="intent"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-200 hover:shadow-soft"
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.src = PRODUCT_PLACEHOLDER; }}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <img src={PRODUCT_PLACEHOLDER} alt={product.name} loading="lazy" decoding="async" className="size-full object-cover" />
        )}
        <FavoriteButton kind="products" id={product.id} className="absolute top-2 right-2" />
        {discount && (
          <span className="absolute top-2 left-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            -{discountPct}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <span className="mb-1 line-clamp-2 text-sm font-bold text-foreground">{product.name}</span>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-h4 text-primary">{formatDA(offer.price)}</span>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <RatingStars rating={rating} size="size-3" showValue />
            <OpenBadge status={status} detailed />
          </div>
        </div>
        <span className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{store.name}</span>
      </div>
    </Link>
  );
}