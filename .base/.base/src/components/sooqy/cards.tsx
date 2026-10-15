import { Link } from "@tanstack/react-router";
import { MapPin, Navigation, Star } from "lucide-react";
import { formatDA, formatKm, directionsUrl, isOpenNow } from "@/lib/geo";
import type { ProductGroup, Store } from "@/lib/sooqy";
import { OpenBadge, StockBadge, VerifiedBadge } from "./badges";

export function ProductCard({ g }: { g: ProductGroup }) {
  const level = g.available ? (g.totalStock <= 3 ? "low" : "in") : "out";
  return (
    <Link
      to="/products/$productId"
      params={{ productId: g.product.id }}
      className="group overflow-hidden rounded-2xl bg-card shadow-soft transition hover:shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {g.image ? (
          <img src={g.image} alt={g.product.name} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex size-full items-center justify-center text-4xl">🛍️</div>
        )}
        <StockBadge level={level} className="absolute top-2 right-2 bg-card/95 backdrop-blur" />
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-1 text-sm font-semibold">{g.product.name}</p>
        <p className="text-base font-bold text-ink">
          <span className="text-[11px] font-medium text-muted-foreground">ابتداءً من </span>
          {formatDA(g.minPrice)}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="size-3" />
          {g.offers.length} محل{g.nearestKm != null && ` · الأقرب ${formatKm(g.nearestKm)}`}
        </p>
      </div>
    </Link>
  );
}

export function StoreCard({ s, distance }: { s: Store; distance?: number | null }) {
  const open = isOpenNow(s.opening_hours);
  return (
    <div className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft">
      <Link to="/stores/$storeId" params={{ storeId: s.id }} className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
        {(s.logo_url || s.cover_url) && <img src={s.logo_url || s.cover_url!} alt={s.name} loading="lazy" className="size-full object-cover" />}
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <Link to="/stores/$storeId" params={{ storeId: s.id }} className="line-clamp-1 font-bold">
          {s.name}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <OpenBadge open={open} />
          {s.is_verified && <VerifiedBadge />}
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Star className="size-3 fill-warning text-warning" /> {Number(s.rating).toFixed(1)}
          </span>
          {s.commune && <span className="line-clamp-1">{s.commune}</span>}
          {distance != null && <span className="font-semibold text-ink">{formatKm(distance)}</span>}
        </p>
      </div>
      <a
        href={directionsUrl(s.latitude, s.longitude, s.name)}
        target="_blank"
        rel="noreferrer"
        aria-label="الاتجاهات"
        className="flex size-10 shrink-0 items-center justify-center self-center rounded-full bg-ink text-ink-foreground"
      >
        <Navigation className="size-4" />
      </a>
    </div>
  );
}
