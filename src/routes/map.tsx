import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { Crosshair, Filter, Navigation, Search, X } from "lucide-react";
import { ALGIERS, directionsUrl, formatKm, isOpenNow, useGeo } from "@/lib/geo";
import { fetchNearStores } from "@/lib/sooqy";
import { OpenBadge, VerifiedBadge } from "@/components/sooqy/badges";
import { ErrorState } from "@/components/sooqy/error-state";
import { RatingStars } from "@/components/sooqy/rating-stars";
import { cn } from "@/lib/utils";

const StoreMap = lazy(() => import("@/components/sooqy/StoreMap"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "الخريطة — SooQy" },
      { name: "description", content: "خريطة تفاعلية للمحلات القريبة منك في الجزائر." },
    ],
  }),
  component: MapPage,
});

type Sort = "near" | "rating";

function MapPage() {
  const { pos, denied } = useGeo();
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sort, setSort] = useState<Sort>("near");
  const [showFilters, setShowFilters] = useState(false);
  const [center, setCenter] = useState(ALGIERS);

  const stores = useQuery({
    queryKey: ["near-stores", null, pos?.lat, pos?.lng],
    queryFn: () => fetchNearStores(null, pos?.lat, pos?.lng),
  });

  let list = stores.data ?? [];
  if (q.trim()) list = list.filter((s) => s.name.includes(q.trim()));
  if (onlyOpen) list = list.filter((s) => isOpenNow(s.opening_hours));
  if (sort === "near") list = [...list].sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
  else list = [...list].sort((a, b) => Number(b.rating) - Number(a.rating));

  const sel = list.find((s) => s.id === active) ?? stores.data?.find((s) => s.id === active);

  return (
    <div className="fixed inset-0 bottom-16 z-0">
      <ClientOnly fallback={<div className="size-full animate-pulse bg-muted" />}>
        <Suspense fallback={<div className="size-full animate-pulse bg-muted" />}>
          <StoreMap
            center={pos && center === ALGIERS ? pos : center}
            user={pos}
            stores={list}
            activeId={active}
            onSelect={setActive}
          />
        </Suspense>
      </ClientOnly>

      {/* شريط البحث */}
      <div className="absolute inset-x-4 top-4 z-[1000]">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card/95 px-4 shadow-soft backdrop-blur">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن متجر أو مكان..."
            aria-label="بحث في الخريطة"
            className="h-12 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="مسح البحث" className="text-muted-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11px] font-medium text-muted-foreground">
          {denied ? "فعّل الموقع لحساب المسافة" : `${list.length} محل`}
        </p>
      </div>

      {stores.isError && (
        <div className="absolute inset-x-4 top-32 z-[1000]">
          <ErrorState onRetry={() => stores.refetch()} />
        </div>
      )}

      {/* أزرار عائمة */}
      <div className="absolute top-24 left-4 z-[1000] flex flex-col gap-2">
        <button
          aria-label="الفلاتر"
          onClick={() => setShowFilters(true)}
          className={cn("icon-btn shadow-soft", (onlyOpen || sort !== "near") && "bg-primary text-primary-foreground border-primary")}
        >
          <Filter className="size-5" />
        </button>
        <button
          aria-label="موقعي الحالي"
          onClick={() => pos && setCenter({ ...pos })}
          className="icon-btn shadow-soft"
        >
          <Crosshair className="size-5" />
        </button>
      </div>

      {/* لوحة المتجر المختار */}
      {sel && (
        <div className="absolute inset-x-3 bottom-3 z-[1000] animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-lift">
          <button
            aria-label="غلق"
            onClick={() => setActive(null)}
            className="absolute top-3 left-3 flex size-8 items-center justify-center rounded-full bg-neutral-100 text-muted-foreground"
          >
            <X className="size-4" />
          </button>
          <div className="flex gap-3">
            <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              {sel.cover_url && <img src={sel.cover_url} alt="" className="size-full object-cover" />}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="line-clamp-1 font-bold">{sel.name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <OpenBadge open={isOpenNow(sel.opening_hours)} />
                {sel.is_verified && <VerifiedBadge />}
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <RatingStars rating={Number(sel.rating)} size="size-3" showValue />
                {sel.commune}
                {sel.distance != null && <span className="font-bold text-ink">{formatKm(sel.distance)}</span>}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/stores/$storeId"
              params={{ storeId: sel.id }}
              className="btn-secondary !h-11 text-sm"
            >
              عرض المتجر
            </Link>
            <a
              href={directionsUrl(sel.latitude, sel.longitude, sel.name)}
              target="_blank"
              rel="noreferrer"
              className="btn-primary !h-11 text-sm"
            >
              <Navigation className="size-4" />
              الاتجاهات
            </a>
          </div>
        </div>
      )}

      {/* لوحة الفلاتر */}
      {showFilters && (
        <div className="absolute inset-0 z-[1100] flex items-end bg-black/30" onClick={() => setShowFilters(false)}>
          <div
            className="w-full animate-fade-up rounded-t-3xl border-t border-border bg-card p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300" />
            <h2 className="text-h3 text-foreground">الفلاتر</h2>
            <div className="mt-4 space-y-2">
              {(
                [
                  { id: "near", label: "الأقرب إليك" },
                  { id: "rating", label: "الأعلى تقييمًا" },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSort(o.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition",
                    sort === o.id
                      ? "border-primary bg-primary-soft text-primary-soft-foreground"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {o.label}
                  <span
                    className={cn(
                      "size-4 rounded-full border-2 transition",
                      sort === o.id ? "border-primary bg-primary" : "border-neutral-300",
                    )}
                  />
                </button>
              ))}
              <button
                onClick={() => setOnlyOpen(!onlyOpen)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition",
                  onlyOpen
                    ? "border-primary bg-primary-soft text-primary-soft-foreground"
                    : "border-border bg-card text-foreground",
                )}
              >
                مفتوح الآن فقط
                <span
                  className={cn(
                    "size-4 rounded-full border-2 transition",
                    onlyOpen ? "border-primary bg-primary" : "border-neutral-300",
                  )}
                />
              </button>
            </div>
            <button onClick={() => setShowFilters(false)} className="btn-primary mt-5 w-full">
              تطبيق الفلاتر
            </button>
          </div>
        </div>
      )}
    </div>
  );
}