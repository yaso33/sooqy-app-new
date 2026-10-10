import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Store as StoreIcon, Search, SlidersHorizontal, X, Star, Shield } from "lucide-react";
import { useGeo } from "@/lib/geo";
import { fetchNearStores, searchStores } from "@/lib/sooqy";
import { StoreCard } from "@/components/sooqy/cards";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { CommuneSelect } from "@/components/sooqy/CommuneSelect";
import { PageHeader } from "@/components/sooqy/page-header";
import { ListSkeleton } from "@/components/sooqy/skeleton";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { Reveal } from "@/components/sooqy/reveal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stores/")({
  head: () => ({
    meta: [
      { title: "المتاجر — SooQy" },
      { name: "description", content: "تصفح المتاجر القريبة منك في كل الولايات." },
    ],
  }),
  component: StoresPage,
});

const PAGE_SIZE = 20;

function StoresPage() {
  const { pos } = useGeo();
  const [q, setQ] = useState("");
  const [wilaya, setWilaya] = useState<number | null>(null);
  const [commune, setCommune] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const browsing = !q.trim() && !wilaya && !commune && !openOnly && !verifiedOnly && !minRating;

  // وضع التصفح: أقرب المتاجر (حسب الموقع أو الولاية)
  const nearStores = useQuery({
    queryKey: ["near-stores", wilaya, pos?.lat, pos?.lng],
    queryFn: () => fetchNearStores(wilaya, pos?.lat, pos?.lng),
    enabled: browsing,
  });

  // وضع البحث/الفلاتر: بحث حقيقي عبر searchStores
  const results = useInfiniteQuery({
    queryKey: [
      "search-stores",
      q,
      wilaya,
      commune,
      openOnly,
      verifiedOnly,
      minRating,
      pos?.lat,
      pos?.lng,
    ],
    queryFn: ({ pageParam }) =>
      searchStores({
        query: q.trim() || undefined,
        wilaya: wilaya ?? undefined,
        commune: commune ?? undefined,
        openOnly,
        verifiedOnly,
        minRating: minRating ?? undefined,
        lat: pos?.lat,
        lng: pos?.lng,
        sortBy: "nearest",
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    enabled: !browsing,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || browsing || !results.hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) results.fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browsing, results.hasNextPage, q, wilaya, commune, openOnly, verifiedOnly, minRating]);

  const list = browsing ? (nearStores.data ?? []) : (results.data?.pages ?? []).flat();
  const loading = browsing ? nearStores.isLoading : results.isLoading;
  const error = browsing ? nearStores.error : results.error;
  const retry = browsing ? () => nearStores.refetch() : () => results.refetch();

  const hasActiveFilters = !!(wilaya || commune || openOnly || verifiedOnly || minRating);

  return (
    <div className="space-y-4 px-4 pt-5">
      <PageHeader title="المتاجر" subtitle="تصفح المتاجر القريبة منك" />

      {/* البحث */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن متجر أو بلدية..."
            aria-label="بحث عن متجر"
            className="h-12 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
          />
          {q && (
            <button
              aria-label="مسح البحث"
              onClick={() => setQ("")}
              className="text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* الفلاتر السريعة */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button
          onClick={() => setOpenOnly((v) => !v)}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-3.5 py-2 text-xs font-bold transition",
            openOnly
              ? "border-primary bg-primary-soft text-primary-soft-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <StoreIcon className="size-3.5" /> مفتوح الآن
        </button>
        <button
          onClick={() => setVerifiedOnly((v) => !v)}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-3.5 py-2 text-xs font-bold transition",
            verifiedOnly
              ? "border-primary bg-primary-soft text-primary-soft-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <Shield className="size-3.5" /> موثّقة فقط
        </button>
        <button
          onClick={() => setShowFilters(true)}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-3.5 py-2 text-xs font-bold transition",
            hasActiveFilters
              ? "border-primary bg-primary-soft text-primary-soft-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="size-3.5" /> الولاية والبلدية
        </button>
      </div>

      <p className="text-xs font-medium text-muted-foreground">
        {loading ? "جارٍ التحميل..." : `${list.length} متجر`}
      </p>

      {loading && <ListSkeleton count={4} />}
      {!loading && error && <ErrorState scope="stores:list" error={error} onRetry={retry} />}
      {!loading && !error && list.length === 0 && (
        <EmptyState
          icon="🏪"
          title="لا توجد متاجر مطابقة"
          hint="جرّب تغيير الولاية أو إزالة الفلاتر."
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((s, i) => (
          <Reveal key={s.id} index={i}>
            <StoreCard s={s} distance={s.distance} />
          </Reveal>
        ))}
      </div>
      <div ref={sentinelRef} className="h-2" />

      {/* لوحة الفلاتر */}
      {showFilters && (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-black/30"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="w-full animate-fade-up rounded-t-3xl border-t border-border bg-card p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300" />
            <h2 className="text-h3 text-foreground">الولاية والبلدية</h2>

            <div className="mt-4 space-y-3">
              <WilayaSelect value={wilaya} onChange={setWilaya} className="h-12 w-full" />
              <CommuneSelect
                value={commune}
                onChange={setCommune}
                wilayaId={wilaya}
                className="h-12 w-full"
              />
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => setMinRating(minRating === 4 ? null : 4)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition",
                  minRating === 4
                    ? "border-primary bg-primary-soft text-primary-soft-foreground"
                    : "border-border bg-card",
                )}
              >
                <span className="flex items-center gap-2">
                  <Star className="size-4 text-primary" /> تقييم 4+ فقط
                </span>
                {minRating === 4 && <X className="size-4" />}
              </button>
              <button
                onClick={() => setVerifiedOnly((v) => !v)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition",
                  verifiedOnly
                    ? "border-primary bg-primary-soft text-primary-soft-foreground"
                    : "border-border bg-card",
                )}
              >
                <span className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" /> المتاجر الموثّقة فقط
                </span>
                {verifiedOnly && <X className="size-4" />}
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setWilaya(null);
                  setCommune(null);
                  setMinRating(null);
                  setVerifiedOnly(false);
                  setOpenOnly(false);
                }}
                className="btn-secondary flex-1 py-3"
              >
                مسح الفلاتر
              </button>
              <button onClick={() => setShowFilters(false)} className="btn-primary flex-1 py-3">
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
