import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { Search, SlidersHorizontal, X, RefreshCw, AlertCircle, Package, Store } from "lucide-react";
import { isOpenNow, useGeo, getStoreStatus, type StoreStatus } from "@/lib/geo";
import { track } from "@/lib/analytics";
import {
  CATEGORIES,
  fetchCommunes,
  fetchNearStores,
  searchProducts,
  searchStores,
  storeDistance,
  type SortBy,
  categoryLabel,
} from "@/lib/sooqy";
import { ProductCard, StoreCard } from "@/components/sooqy/cards";
import { CommuneSelect } from "@/components/sooqy/CommuneSelect";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { PageHeader } from "@/components/sooqy/page-header";
import { ProductGridSkeleton, ListSkeleton } from "@/components/sooqy/skeleton";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { Reveal } from "@/components/sooqy/reveal";
import { ImageSearchRow } from "@/components/sooqy/ImageSearchRow";
import { useVisualOrder } from "@/lib/use-visual-order";
import type { VisualProfile } from "@/lib/image-search";
import { cn } from "@/lib/utils";

type Search = {
  q?: string | undefined;
  cat?: string | undefined;
  w?: number | undefined;
  stock?: boolean | undefined;
  open?: boolean | undefined;
  min?: number | undefined;
  max?: number | undefined;
  sort?: SortBy | undefined;
  view?: "products" | "stores" | "all" | undefined;
  radius?: number | undefined; // km
  commune?: string | undefined;
};

const PAGE_SIZE = 24;

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    cat: typeof s["cat"] === "string" ? s["cat"] : undefined,
    w: s["w"] != null && !Number.isNaN(Number(s["w"])) ? Number(s["w"]) : undefined,
    stock: s["stock"] === true || s["stock"] === "true" ? true : undefined,
    open: s["open"] === true || s["open"] === "true" ? true : undefined,
    min: s["min"] != null && !Number.isNaN(Number(s["min"])) ? Number(s["min"]) : undefined,
    max: s["max"] != null && !Number.isNaN(Number(s["max"])) ? Number(s["max"]) : undefined,
    sort: ["cheapest", "nearest", "rating", "newest"].includes(String(s["sort"]))
      ? (s["sort"] as SortBy)
      : undefined,
    view: s["view"] === "stores" || s["view"] === "all" ? s["view"] : undefined,
    radius:
      s["radius"] != null && !Number.isNaN(Number(s["radius"])) ? Number(s["radius"]) : undefined,
    commune: typeof s["commune"] === "string" ? s["commune"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "اكتشف — SooQy" },
      { name: "description", content: "استكشف المنتجات والمتاجر القريبة منك في الجزائر." },
    ],
  }),
  component: Explore,
});

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function recentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem("sooqy:recent-searches") ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  const t = term.trim();
  if (!t) return;
  const next = [t, ...recentSearches().filter((x) => x !== t)].slice(0, 5);
  localStorage.setItem("sooqy:recent-searches", JSON.stringify(next));
}

const SORT_LABELS: Record<SortBy, string> = {
  newest: "الأحدث",
  cheapest: "الأرخص",
  nearest: "الأقرب",
  rating: "الأعلى تقييمًا",
};

function Explore() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const { pos } = useGeo();
  const [text, setText] = useState(s.q ?? "");
  const [focused, setFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [minText, setMinText] = useState(s.min != null ? String(s.min) : "");
  const [maxText, setMaxText] = useState(s.max != null ? String(s.max) : "");
  const [radiusText, setRadiusText] = useState(s.radius != null ? String(s.radius) : "");
  const [visual, setVisual] = useState<VisualProfile | null>(null);
  const q = useDebounced(text);
  const set = (patch: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  useEffect(() => {
    if ((s.q ?? "") !== q) set({ q: q || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const browsing =
    !q.trim() &&
    !s.cat &&
    s.w == null &&
    !s.stock &&
    !s.open &&
    s.min == null &&
    s.max == null &&
    !s.sort &&
    s.radius == null &&
    s.commune == null;
  const view = s.view ?? (browsing ? "products" : "all");

  const products = useInfiniteQuery({
    queryKey: [
      "search",
      q,
      s.cat,
      s.w,
      s.stock,
      s.min,
      s.max,
      s.sort,
      s.radius,
      s.commune,
      pos?.lat,
    ],
    queryFn: ({ pageParam }) =>
      searchProducts({
        query: q,
        category: s.cat ?? null,
        wilaya: s.w ?? null,
        inStockOnly: !!s.stock,
        ...(s.min != null ? { minPrice: s.min } : {}),
        ...(s.max != null ? { maxPrice: s.max } : {}),
        sortBy: s.sort ?? "newest",
        pos,
        radius: s.radius ?? null,
        commune: s.commune ?? null,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    enabled: !browsing,
  });

  const bestSellers = useQuery({
    queryKey: ["best-sellers", s.w, pos?.lat],
    queryFn: () => searchProducts({ wilaya: s.w ?? null, pos, sortBy: "rating", limit: 12 }),
    enabled: browsing,
  });

  const stores = useQuery({
    queryKey: ["search-stores", q, s.w, pos?.lat, pos?.lng],
    queryFn: () =>
      searchStores({
        query: q.trim() || undefined,
        wilaya: s.w ?? undefined,
        lat: pos?.lat,
        lng: pos?.lng,
        sortBy: "nearest",
      }),
    enabled: !browsing && (view === "stores" || view === "all"),
  });

  const nearStores = useQuery({
    queryKey: ["near-stores", s.w, pos?.lat, pos?.lng],
    queryFn: () => fetchNearStores(s.w ?? null, pos?.lat, pos?.lng),
    enabled: browsing,
  });

  const allProducts = (products.data?.pages ?? []).flat();
  const filteredProducts = s.open
    ? allProducts.filter((g) => g.offers.some((o) => isOpenNow(o.store.opening_hours)))
    : allProducts;

  const visualProducts = useVisualOrder(visual, filteredProducts);

  const recents = recentSearches();
  const suggestions = useRef<{
    cats: { id: string; label: string; emoji: string }[];
    recents: string[];
  }>({
    cats: [],
    recents: [],
  });
  suggestions.current = {
    cats: CATEGORIES.filter((c) => c.label.includes(text.trim())).slice(0, 3),
    recents: text.trim()
      ? recents.filter((r) => r.includes(text.trim())).slice(0, 5)
      : recents.slice(0, 5),
  };
  const showSuggestions =
    focused &&
    (text.trim().length > 0
      ? suggestions.current.cats.length > 0 || suggestions.current.recents.length > 0
      : suggestions.current.recents.length > 0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || browsing || view === "stores" || !products.hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) products.fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    browsing,
    view,
    products.hasNextPage,
    q,
    s.cat,
    s.w,
    s.stock,
    s.min,
    s.max,
    s.sort,
    s.radius,
    s.commune,
  ]);

  const applyFilters = () => {
    const min = minText ? Number(minText) : undefined;
    const max = maxText ? Number(maxText) : undefined;
    const radius = radiusText ? Number(radiusText) : undefined;
    if (
      (min != null && Number.isNaN(min)) ||
      (max != null && Number.isNaN(max)) ||
      (radius != null && Number.isNaN(radius))
    )
      return;
    set({
      min: min != null && min >= 0 ? min : undefined,
      max: max != null && max > 0 ? max : undefined,
      radius: radius != null && radius > 0 ? radius : undefined,
    });
    setShowFilters(false);
  };

  const runSearch = (term: string) => {
    saveRecentSearch(term);
    track("search", { q: term.trim() });
    set({ q: term.trim() || undefined });
  };

  return (
    <div className="space-y-4 px-4 pt-5">
      <PageHeader title="اكتشف" subtitle="استكشف المنتجات والمتاجر القريبة" />

      {/* البحث */}
      <div className="sticky top-0 z-20 -mx-4 space-y-3 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="relative">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(text);
              }}
              placeholder="ابحث عن منتج أو متجر..."
              aria-label="بحث"
              className="h-12 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
            />
            {text && (
              <button
                aria-label="مسح البحث"
                onClick={() => setText("")}
                className="text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {showSuggestions && (
            <div className="absolute inset-x-0 top-full z-30 mt-2 space-y-1 rounded-2xl border border-border bg-card p-2 shadow-lift">
              {suggestions.current.recents.map((r) => (
                <button
                  key={r}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setText(r);
                    runSearch(r);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Search className="size-3.5" /> {r}
                </button>
              ))}
              {suggestions.current.cats.map((c) => (
                <button
                  key={c.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setText("");
                    set({ q: undefined, cat: c.id });
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span>{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* الفئات */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip active={!s.cat} onClick={() => set({ cat: undefined })}>
            الكل
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={s.cat === c.id}
              onClick={() => set({ cat: s.cat === c.id ? undefined : c.id })}
            >
              {c.emoji} {c.label}
            </Chip>
          ))}
        </div>
      </div>

      <ImageSearchRow onChange={setVisual} />

      {browsing ? (
        /* ===== وضع التصفح: أقسام ===== */
        <>
          <section className="space-y-3">
            <h2 className="text-h3 text-foreground">وصل حديثًا</h2>
            {products.isLoading && <ProductGridSkeleton count={4} />}
            {products.isError && (
              <ErrorState
                scope="explore:products"
                error={products.error}
                onRetry={() => products.refetch()}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              {(products.data?.pages[0] ?? []).slice(0, 8).map((g, i) => (
                <Reveal key={g.product.id} index={i}>
                  <ProductCard g={g} />
                </Reveal>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-h3 text-foreground">الأكثر مبيعًا</h2>
            {bestSellers.isLoading && <ProductGridSkeleton count={4} />}
            {bestSellers.isError && (
              <ErrorState
                scope="explore:best-sellers"
                error={bestSellers.error}
                onRetry={() => bestSellers.refetch()}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              {(bestSellers.data ?? []).slice(0, 8).map((g, i) => (
                <Reveal key={g.product.id} index={i}>
                  <ProductCard g={g} />
                </Reveal>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-h3 text-foreground">متاجر تستحق الزيارة</h2>
            {nearStores.isLoading && <ListSkeleton count={2} />}
            {nearStores.isError && (
              <ErrorState
                scope="explore:near-stores"
                error={nearStores.error}
                onRetry={() => nearStores.refetch()}
              />
            )}
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {(nearStores.data ?? []).slice(0, 6).map((st, i) => (
                <Reveal key={st.id} index={i}>
                  <div className="w-64 shrink-0">
                    <StoreCard s={st} distance={st.distance} />
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </>
      ) : (
        /* ===== وضع البحث: نتائج ===== */
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex rounded-xl bg-card p-1">
              {(
                [
                  { id: "all", label: "الكل" },
                  { id: "products", label: "المنتجات" },
                  { id: "stores", label: "المتاجر" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => set({ view: t.id })}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-bold transition",
                    view === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition",
                s.sort ||
                  s.stock ||
                  s.open ||
                  s.w != null ||
                  s.min != null ||
                  s.max != null ||
                  s.radius != null ||
                  s.commune != null ||
                  s.cat != null
                  ? "border-primary bg-primary-soft text-primary-soft-foreground"
                  : "border-border bg-card text-foreground",
              )}
            >
              <SlidersHorizontal className="size-4" />
              فلاتر
            </button>
          </div>

          <p className="text-xs font-medium text-muted-foreground">
            {products.isLoading ? "جارٍ البحث..." : `${filteredProducts.length} نتيجة`}
          </p>

          {view !== "stores" && (
            <>
              {products.isLoading && <ProductGridSkeleton count={6} />}
              {products.isError && (
                <ErrorState
                  scope="explore:products"
                  error={products.error}
                  onRetry={() => products.refetch()}
                />
              )}
              {!products.isLoading && (
                <div className="grid grid-cols-2 gap-3">
                  {visualProducts.map((g, i) => (
                    <Reveal key={g.product.id} index={i}>
                      <ProductCard g={g} />
                    </Reveal>
                  ))}
                </div>
              )}
              {!products.isLoading && visualProducts.length === 0 && (
                <EmptyState
                  icon="🔍"
                  title="لم نعثر على نتائج"
                  hint="جرّب كلمة أخرى أو أزل بعض الفلاتر."
                />
              )}
              <div ref={sentinelRef} className="h-2" />
            </>
          )}

          {view !== "products" && (
            <div className="space-y-3">
              {stores.isLoading && <ListSkeleton count={4} />}
              {stores.isError && (
                <ErrorState
                  scope="explore:stores"
                  error={stores.error}
                  onRetry={() => stores.refetch()}
                />
              )}
              {!stores.isLoading && (stores.data ?? []).length === 0 && (
                <EmptyState
                  icon="🏪"
                  title="لا توجد محلات"
                  hint="جرّب البحث باسم محل أو مدينة أخرى."
                />
              )}
              {(stores.data ?? []).map((st) => (
                <StoreCard key={st.id} s={st} distance={storeDistance(st, pos)} />
              ))}
            </div>
          )}
        </>
      )}

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
            <h2 className="text-h3 text-foreground">الفلاتر والترتيب</h2>

            {/* مؤشرات الفلاتر النشطة */}
            {(s.cat ||
              s.w != null ||
              s.commune ||
              s.radius != null ||
              s.stock ||
              s.open ||
              s.min != null ||
              s.max != null ||
              s.sort) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {s.cat && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
                    {categoryLabel(s.cat)}
                    <button
                      type="button"
                      onClick={() => set({ cat: undefined })}
                      className="hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                )}
                {s.w != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
                    ولاية
                    <button
                      type="button"
                      onClick={() => set({ w: undefined })}
                      className="hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                )}
                {s.commune && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
                    {s.commune}
                    <button
                      type="button"
                      onClick={() => set({ commune: undefined })}
                      className="hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                )}
                {s.radius != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
                    {s.radius} كم
                    <button
                      type="button"
                      onClick={() => set({ radius: undefined })}
                      className="hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                )}
                {s.stock && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
                    متوفر
                    <button
                      type="button"
                      onClick={() => set({ stock: undefined })}
                      className="hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                )}
                {s.open && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
                    مفتوح
                    <button
                      type="button"
                      onClick={() => set({ open: undefined })}
                      className="hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                )}
                {s.min != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
                    من {s.min} دج
                    <button
                      type="button"
                      onClick={() => set({ min: undefined })}
                      className="hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                )}
                {s.max != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
                    إلى {s.max} دج
                    <button
                      type="button"
                      onClick={() => set({ max: undefined })}
                      className="hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                )}
                {s.sort && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
                    {SORT_LABELS[s.sort]}
                    <button
                      type="button"
                      onClick={() => set({ sort: undefined })}
                      className="hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">التصنيف</p>
                <select
                  value={s.cat ?? ""}
                  onChange={(e) => set({ cat: e.target.value || undefined })}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">جميع التصنيفات</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">الولاية</p>
                <WilayaSelect
                  value={s.w ?? null}
                  onChange={(w) => set({ w: w ?? undefined })}
                  className="w-full"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">البلدية</p>
                <CommuneSelect
                  wilayaId={s.w ?? null}
                  value={s.commune ?? null}
                  onChange={(c) => set({ commune: c ?? undefined })}
                  className="w-full"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">نطاق البحث (كم)</p>
                <input
                  inputMode="numeric"
                  value={radiusText}
                  onChange={(e) => setRadiusText(e.target.value)}
                  placeholder="مثال: 10"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">الترتيب</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SORT_LABELS) as SortBy[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => set({ sort: s.sort === k ? undefined : k })}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                        s.sort === k
                          ? "border-primary bg-primary-soft text-primary-soft-foreground"
                          : "border-border bg-card text-foreground",
                      )}
                    >
                      {SORT_LABELS[k]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <label className="flex flex-1 items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm font-semibold">
                  متوفر الآن
                  <input
                    type="checkbox"
                    checked={!!s.stock}
                    onChange={(e) => set({ stock: e.target.checked || undefined })}
                    className="size-4 accent-[#6366F1]"
                  />
                </label>
                <label className="flex flex-1 items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm font-semibold">
                  مفتوح الآن
                  <input
                    type="checkbox"
                    checked={!!s.open}
                    onChange={(e) => set({ open: e.target.checked || undefined })}
                    className="size-4 accent-[#6366F1]"
                  />
                </label>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">السعر (دج)</p>
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={minText}
                    onChange={(e) => setMinText(e.target.value)}
                    placeholder="من"
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    inputMode="numeric"
                    value={maxText}
                    onChange={(e) => setMaxText(e.target.value)}
                    placeholder="إلى"
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  set({
                    cat: undefined,
                    w: undefined,
                    commune: undefined,
                    radius: undefined,
                    stock: undefined,
                    open: undefined,
                    min: undefined,
                    max: undefined,
                    sort: undefined,
                  })
                }
                className="btn-secondary flex-1"
              >
                مسح الفلاتر
              </button>
              <button onClick={applyFilters} className="btn-primary flex-1">
                تطبيق الفلاتر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
