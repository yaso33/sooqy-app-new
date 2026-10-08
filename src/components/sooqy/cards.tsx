import { Link } from "@tanstack/react-router";
import { MapPin, Navigation } from "lucide-react";
import { formatDA, formatKm, directionsUrl, isOpenNow } from "@/lib/geo";
import type { ProductGroup, Store } from "@/lib/sooqy";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { OpenBadge, VerifiedBadge } from "./badges";
import { RatingStars } from "./rating-stars";
import { cn } from "@/lib/utils";

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
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-4xl">🛍️</div>
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
  const open = isOpenNow(s.opening_hours);
  return (
    <Link
      to="/stores/$storeId"
      params={{ storeId: s.id }}
      preload="intent"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-200 hover:shadow-soft"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {(s.cover_url || s.logo_url) && (
          <img
            src={s.cover_url || s.logo_url!}
            alt={s.name}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <OpenBadge open={open} className="absolute top-2 right-2 bg-card/95 backdrop-blur" />
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
  const open = isOpenNow(s.opening_hours);
  return (
    <Link
      to="/stores/$storeId"
      params={{ storeId: s.id }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:shadow-soft"
    >
      <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
        {(s.logo_url || s.cover_url) && (
          <img src={s.logo_url || s.cover_url!} alt={s.name} loading="lazy" className="size-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block line-clamp-1 text-sm font-bold">{s.name}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <RatingStars rating={Number(s.rating)} size="size-3" showValue />
          {distance != null && <span>{formatKm(distance)}</span>}
          <OpenBadge open={open} />
        </span>
      </span>
      <a
        href={directionsUrl(s.latitude, s.longitude, s.name)}
        target="_blank"
        rel="noreferrer"
        aria-label="الاتجاهات إلى المتجر"
        onClick={(e) => e.stopPropagation()}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition active:scale-95"
      >
        <Navigation className="size-4" />
      </a>
    </Link>
  );
}