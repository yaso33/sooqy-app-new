import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, MapPin, Search } from "lucide-react";
import { useGeo } from "@/lib/geo";
import { fetchHomepageOffers, fetchMostViewedGroups, searchProducts } from "@/lib/sooqy";
import { OfferCard, ProductCard } from "@/components/sooqy/cards";
import { WilayaButton } from "@/components/sooqy/WilayaSelect";
import { ProductGridSkeleton } from "@/components/sooqy/skeleton";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { Reveal } from "@/components/sooqy/reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SooQy — اكتشف المنتجات من حولك" },
      {
        name: "description",
        content: "اكتشف السلع القريبة منك، قارن الأسعار، واحجز أو اطلب التوصيل إلى 58 ولاية.",
      },
      { property: "og:title", content: "SooQy — السوق الجزائري في جيبك" },
      { property: "og:description", content: "Discover. Shop. Local." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { pos } = useGeo();
  const [wilaya, setWilaya] = useState<number | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const w = localStorage.getItem("sooqy:wilaya");
    if (w) setWilaya(Number(w));
  }, []);

  const changeWilaya = (w: number | null) => {
    setWilaya(w);
    if (w) localStorage.setItem("sooqy:wilaya", String(w));
    else localStorage.removeItem("sooqy:wilaya");
  };

  const trending = useInfiniteQuery({
    queryKey: ["trending", wilaya, pos?.lat],
    queryFn: ({ pageParam = 0 }) =>
      searchProducts({ wilaya, pos, sortBy: "newest", limit: 20, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 20 ? allPages.length * 20 : undefined,
  });
  const nearbyProducts = useQuery({
    queryKey: ["nearby-products", wilaya, pos?.lat, pos?.lng],
    queryFn: () => searchProducts({ wilaya, pos, sortBy: "nearest", limit: 12 }),
  });
  const topRatedProducts = useQuery({
    queryKey: ["top-rated-products", wilaya, pos?.lat, pos?.lng],
    queryFn: () => searchProducts({ wilaya, pos, sortBy: "rating", limit: 10 }),
  });
  const offers = useInfiniteQuery({
    queryKey: ["homepage-offers", wilaya],
    queryFn: ({ pageParam = 0 }) =>
      fetchHomepageOffers({ wilayaId: wilaya, limit: 8, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 8 ? allPages.length * 8 : undefined,
  });
  const mostViewed = useInfiniteQuery({
    queryKey: ["most-viewed"],
    queryFn: ({ pageParam = 0 }) => fetchMostViewedGroups({ limit: 10, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 10 ? allPages.length * 10 : undefined,
  });

  const products = (trending.data?.pages ?? []).flat();
  const offerList = (offers.data?.pages ?? []).flat();
  const mostViewedProducts = (mostViewed.data?.pages ?? []).flat();
  const nearby = nearbyProducts.data ?? [];
  const topRated = topRatedProducts.data ?? [];

  return (
    <div className="space-y-8 px-4 pt-4">
      {/* الترويسة */}
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-display tracking-[0.02em] text-primary">SOOQY</h1>
        <div className="flex items-center gap-2">
          <WilayaButton value={wilaya} onChange={changeWilaya} />
          <Link to="/notifications" aria-label="الإشعارات" className="icon-btn">
            <Bell className="size-5" />
          </Link>
        </div>
      </header>

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
          placeholder="ابحث عن منتج..."
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

      {/* سلع قريبة منك */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-foreground">سلع قريبة منك</h2>
          <Link to="/explore" className="text-sm font-bold text-primary">
            عرض الكل
          </Link>
        </div>
        {nearbyProducts.isLoading && <ProductGridSkeleton count={4} />}
        {nearbyProducts.isError && (
          <ErrorState
            scope="home:nearby-products"
            error={nearbyProducts.error}
            onRetry={() => nearbyProducts.refetch()}
          />
        )}
        {!nearbyProducts.isLoading && nearby.length === 0 && (
          <EmptyState
            icon="📍"
            title="لا توجد سلع قريبة حالياً"
            hint="جرّب تغيير الولاية أو تصفّح سلعاً أخرى."
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          {nearby.slice(0, 8).map((g, i) => (
            <Reveal key={g.product.id} index={i}>
              <ProductCard g={g} />
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

      {/* الأعلى تقييماً */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-foreground">الأعلى تقييماً</h2>
          <Link to="/explore" className="text-sm font-bold text-primary">
            عرض الكل
          </Link>
        </div>
        {topRatedProducts.isLoading && <ProductGridSkeleton count={4} />}
        {topRatedProducts.isError && (
          <ErrorState
            scope="home:top-rated"
            error={topRatedProducts.error}
            onRetry={() => topRatedProducts.refetch()}
          />
        )}
        {!topRatedProducts.isLoading && topRated.length === 0 && (
          <EmptyState
            icon="⭐"
            title="لا توجد سلع مقيَّمة بعد"
            hint="ستظهر هنا السلع من المتاجر الأعلى تقييماً."
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          {topRated.slice(0, 8).map((g, i) => (
            <Reveal key={g.product.id} index={i}>
              <ProductCard g={g} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* زر استكشاف جميع المتاجر */}
      <div className="pt-2 text-center">
        <Link to="/stores" className="btn-secondary inline-flex items-center gap-2">
          استكشاف جميع المتاجر
          <MapPin className="size-4" />
        </Link>
      </div>
    </div>
  );
}
