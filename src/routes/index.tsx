import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, MapPin, Search, User } from "lucide-react";
import { useGeo } from "@/lib/geo";
import {
  CATEGORIES,
  fetchNearStores,
  fetchHomepageOffers,
  fetchSuggestedStores,
  fetchMostViewedGroups,
  searchProducts,
} from "@/lib/sooqy";
import { ProductCard, StoreCard } from "@/components/sooqy/cards";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { OfferCard } from "@/components/sooqy/cards";
import { ProductGridSkeleton, ListSkeleton } from "@/components/sooqy/skeleton";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { Reveal } from "@/components/sooqy/reveal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SooQy — اكتشف المتاجر من حولك" },
      {
        name: "description",
        content: "اكتشف المتاجر القريبة منك، قارن الأسعار، واحجز أو اطلب التوصيل إلى 58 ولاية.",
      },
      { property: "og:title", content: "SooQy — السوق الجزائري في جيبك" },
      { property: "og:description", content: "Discover. Shop. Local." },
    ],
  }),
  component: Home,
});

type Pulse = "open" | "near" | "all";

function Home() {
  const navigate = useNavigate();
  const { pos } = useGeo();
  const [wilaya, setWilaya] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [pulse, setPulse] = useState<Pulse>("near");

  useEffect(() => {
    const w = localStorage.getItem("sooqy:wilaya");
    if (w) setWilaya(Number(w));
  }, []);

  const changeWilaya = (w: number | null) => {
    setWilaya(w);
    if (w) localStorage.setItem("sooqy:wilaya", String(w));
    else localStorage.removeItem("sooqy:wilaya");
  };

  const stores = useQuery({
    queryKey: ["near-stores", wilaya, pos?.lat, pos?.lng],
    queryFn: () => fetchNearStores(wilaya, pos?.lat, pos?.lng),
  });
  const trending = useInfiniteQuery({
    queryKey: ["trending", wilaya, pos?.lat],
    queryFn: ({ pageParam = 0 }) =>
      searchProducts({ wilaya, pos, sortBy: "newest", limit: 20, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 20 ? allPages.length * 20 : undefined,
  });
  const offers = useInfiniteQuery({
    queryKey: ["homepage-offers", wilaya],
    queryFn: ({ pageParam = 0 }) =>
      fetchHomepageOffers({ wilayaId: wilaya, limit: 8, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 8 ? allPages.length * 8 : undefined,
  });
  const suggestedStores = useInfiniteQuery({
    queryKey: ["suggested-stores", wilaya, pos?.lat, pos?.lng],
    queryFn: ({ pageParam = 0 }) =>
      fetchSuggestedStores({
        wilayaId: wilaya,
        lat: pos?.lat,
        lng: pos?.lng,
        limit: 6,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 6 ? allPages.length * 6 : undefined,
  });
  const mostViewed = useInfiniteQuery({
    queryKey: ["most-viewed"],
    queryFn: ({ pageParam = 0 }) => fetchMostViewedGroups({ limit: 10, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 10 ? allPages.length * 10 : undefined,
  });

  let storeList = stores.data ?? [];
  if (pulse === "open") storeList = storeList.filter((s) => s.open);
  if (pulse === "near")
    storeList = [...storeList].sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));

  const products = (trending.data?.pages ?? []).flat();
  const offerList = (offers.data?.pages ?? []).flat();
  const suggestedList = (suggestedStores.data?.pages ?? []).flat();
  const mostViewedProducts = (mostViewed.data?.pages ?? []).flat();

  return (
    <div className="space-y-8 px-4 pt-4">
      {/* الترويسة */}
      <header className="flex items-center justify-between">
        <h1 className="text-display text-foreground">SooQy</h1>
        <div className="flex items-center gap-2">
          <Link to="/notifications" aria-label="الإشعارات" className="icon-btn">
            <Bell className="size-5" />
          </Link>
          <Link to="/account" aria-label="حسابي" className="icon-btn">
            <User className="size-5" />
          </Link>
        </div>
      </header>

      {/* الموقع */}
      <div className="flex items-center gap-1.5">
        <MapPin className="size-4 shrink-0 text-primary" />
        <WilayaSelect value={wilaya} onChange={changeWilaya} className="h-9 flex-1 text-sm" />
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </div>

      {/* البحث */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/explore", search: { q: q.trim() || undefined } });
        }}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
      >
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن منتج أو متجر..."
          aria-label="بحث"
          className="h-12 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition active:scale-95"
        >
          ابحث
        </button>
      </form>

      {/* الفئات */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-foreground">التصنيفات</h2>
          <Link to="/explore" className="text-sm font-bold text-primary">
            عرض الكل
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              to="/category/$catId"
              params={{ catId: c.id }}
              className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-primary/40 hover:shadow-soft"
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-xs font-bold">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* المتاجر القريبة */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-foreground">متاجر قريبة منك</h2>
          <Link to="/stores" className="text-sm font-bold text-primary">
            عرض الكل
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {(
            [
              { id: "near", label: "الأقرب" },
              { id: "open", label: "مفتوح الآن" },
              { id: "all", label: "الكل" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPulse(p.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
                pulse === p.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {stores.isLoading && <ListSkeleton count={2} />}
        {stores.isError && (
          <ErrorState
            scope="home:near-stores"
            error={stores.error}
            onRetry={() => stores.refetch()}
          />
        )}
        {!stores.isLoading && storeList.length === 0 && (
          <EmptyState
            icon="🏪"
            title="لا توجد محلات بهذا الفلتر حالياً"
            hint="جرّب تغيير الولاية أو الفلتر."
          />
        )}
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {storeList.slice(0, 6).map((s, i) => (
            <Reveal key={s.id} index={i}>
              <div className="w-64 shrink-0">
                <StoreCard s={s} distance={s.distance} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* منتجات قد تعجبك */}
      <section className="space-y-3">
        <h2 className="text-h3 text-foreground">منتجات قد تعجبك</h2>
        {trending.isLoading && <ProductGridSkeleton count={6} />}
        {trending.isError && (
          <ErrorState
            scope="home:trending"
            error={trending.error}
            onRetry={() => trending.refetch()}
          />
        )}
        {!trending.isLoading && products.length === 0 && (
          <EmptyState
            icon="🛍️"
            title="لا توجد سلع هنا بعد"
            hint="جرّب تغيير الولاية أو البحث عن سلعة أخرى."
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          {products.slice(0, 12).map((g, i) => (
            <Reveal key={g.product.id} index={i}>
              <ProductCard g={g} />
            </Reveal>
          ))}
        </div>
        {trending.hasNextPage && !trending.isFetchingNextPage && (
          <div className="mt-3 text-center">
            <button
              onClick={() => trending.fetchNextPage()}
              className="btn-secondary w-full py-2"
              disabled={trending.isFetchingNextPage}
            >
              تحميل المزيد
            </button>
          </div>
        )}
      </section>

      {/* الأكثر مشاهدة */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-foreground">الأكثر مشاهدة</h2>
          <Link to="/explore" className="text-sm font-bold text-primary">
            عرض الكل
          </Link>
        </div>
        {mostViewed.isLoading && <ProductGridSkeleton count={4} />}
        {mostViewed.isError && (
          <ErrorState
            scope="home:most-viewed"
            error={mostViewed.error}
            onRetry={() => mostViewed.refetch()}
          />
        )}
        {!mostViewed.isLoading && mostViewedProducts.length === 0 && (
          <EmptyState
            icon="👁️"
            title="لا توجد منتجات مشاهدة بعد"
            hint="ستظهر المنتجات الأكثر مشاهدة هنا."
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          {mostViewedProducts.slice(0, 8).map((g, i) => (
            <Reveal key={g.product.id} index={i}>
              <ProductCard g={g} />
            </Reveal>
          ))}
        </div>
        {mostViewed.hasNextPage && !mostViewed.isFetchingNextPage && (
          <div className="mt-3 text-center">
            <button
              onClick={() => mostViewed.fetchNextPage()}
              className="btn-secondary w-full py-2"
              disabled={mostViewed.isFetchingNextPage}
            >
              تحميل المزيد
            </button>
          </div>
        )}
      </section>

      {/* عروض المتاجر */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-foreground">عروض المتاجر</h2>
          <Link to="/explore" className="text-sm font-bold text-primary">
            عرض الكل
          </Link>
        </div>
        {offers.isLoading && <ProductGridSkeleton count={4} />}
        {offers.isError && (
          <ErrorState scope="home:offers" error={offers.error} onRetry={() => offers.refetch()} />
        )}
        {!offers.isLoading && offerList.length === 0 && (
          <EmptyState
            icon="🏷️"
            title="لا توجد عروض حالياً"
            hint="ستظهر العروض هنا عند إضافتها من المتاجر."
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          {offerList.slice(0, 8).map((o, i) => (
            <Reveal key={o.id} index={i}>
              <OfferCard offer={o} />
            </Reveal>
          ))}
        </div>
        {offers.hasNextPage && !offers.isFetchingNextPage && (
          <div className="mt-3 text-center">
            <button
              onClick={() => offers.fetchNextPage()}
              className="btn-secondary w-full py-2"
              disabled={offers.isFetchingNextPage}
            >
              تحميل المزيد
            </button>
          </div>
        )}
      </section>

      {/* متاجر مقترحة */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-foreground">متاجر مقترحة</h2>
          <Link to="/stores" className="text-sm font-bold text-primary">
            عرض الكل
          </Link>
        </div>
        {suggestedStores.isLoading && <ListSkeleton count={3} />}
        {suggestedStores.isError && (
          <ErrorState
            scope="home:suggested"
            error={suggestedStores.error}
            onRetry={() => suggestedStores.refetch()}
          />
        )}
        {!suggestedStores.isLoading && suggestedList.length === 0 && (
          <EmptyState
            icon="🏪"
            title="لا توجد متاجر مقترحة"
            hint="ستظهر متاجر مقترحة بناءً على موقعك."
          />
        )}
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {suggestedList.slice(0, 6).map((s, i) => (
            <Reveal key={s.id} index={i}>
              <div className="w-64 shrink-0">
                <StoreCard s={s} distance={s.distance} />
              </div>
            </Reveal>
          ))}
        </div>
        {suggestedStores.hasNextPage && !suggestedStores.isFetchingNextPage && (
          <div className="mt-3 text-center">
            <button
              onClick={() => suggestedStores.fetchNextPage()}
              className="btn-secondary w-full py-2"
              disabled={suggestedStores.isFetchingNextPage}
            >
              تحميل المزيد
            </button>
          </div>
        )}
      </section>

      {/* زر استكشاف جميع المتاجر */}
      <div className="text-center pt-2">
        <Link to="/stores" className="btn-secondary inline-flex items-center gap-2">
          استكشاف جميع المتاجر
          <MapPin className="size-4" />
        </Link>
      </div>
    </div>
  );
}
