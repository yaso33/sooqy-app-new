import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Heart } from "lucide-react";
import { useGeo } from "@/lib/geo";
import { getProductComparisonOffers, getStore, primaryImage, storeDistance, type ProductGroup, type Store } from "@/lib/sooqy";
import { useFavorites } from "@/lib/favorites";
import { ProductCard, StoreCard } from "@/components/sooqy/cards";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ProductGridSkeleton, ListSkeleton } from "@/components/sooqy/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "المفضلة — SooQy" },
      { name: "description", content: "منتجاتك ومتاجرك المفضلة في مكان واحد." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const favs = useFavorites();
  const { pos } = useGeo();
  const [tab, setTab] = useState<"products" | "stores">("products");

  const products = useQuery({
    queryKey: ["fav-products", favs.products],
    queryFn: async (): Promise<ProductGroup[]> => {
      const settled = await Promise.allSettled(
        favs.products.map(async (id): Promise<ProductGroup> => {
          const offers = await getProductComparisonOffers(id);
          const product = offers[0]?.product;
          if (!product) throw new Error("no offers");
          const prices = offers.map((o) => o.price);
          return {
            product,
            offers,
            minPrice: Math.min(...prices),
            image: primaryImage(offers.flatMap((o) => o.images)),
            available: offers.some((o) => o.stock_quantity > 0),
            totalStock: offers.reduce((s, o) => s + o.stock_quantity, 0),
            nearestKm: null,
          };
        }),
      );
      return settled
        .filter((r): r is PromiseFulfilledResult<ProductGroup> => r.status === "fulfilled")
        .map((r) => r.value);
    },
    enabled: favs.products.length > 0,
  });

  const stores = useQuery({
    queryKey: ["fav-stores", favs.stores],
    queryFn: async (): Promise<Store[]> => {
      const settled = await Promise.allSettled(favs.stores.map((id) => getStore(id)));
      return settled
        .filter((r): r is PromiseFulfilledResult<Store | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((s): s is Store => !!s);
    },
    enabled: favs.stores.length > 0,
  });

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="flex items-center gap-2 py-1">
        <button onClick={() => window.history.back()} aria-label="رجوع" className="icon-btn">
          <ArrowRight className="size-5" />
        </button>
        <h1 className="text-h1 text-foreground">المفضلة</h1>
      </header>

      {/* التبويبات */}
      <div className="flex rounded-xl bg-card p-1">
        {(
          [
            { id: "products", label: `المنتجات (${favs.products.length})` },
            { id: "stores", label: `المتاجر (${favs.stores.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-bold transition",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" &&
        (favs.products.length === 0 ? (
          <EmptyState
            icon={<Heart className="size-8 text-primary" />}
            title="لا توجد منتجات مفضلة بعد"
            hint="اضغط على أيقونة القلب على أي منتج لإضافته هنا."
            action={
              <Link to="/explore" className="btn-primary">
                اكتشف المنتجات
              </Link>
            }
          />
        ) : (
          <>
            {products.isLoading && <ProductGridSkeleton count={4} />}
            <div className="grid grid-cols-2 gap-3">
              {(products.data ?? []).map((g) => (
                <ProductCard key={g.product.id} g={g} />
              ))}
            </div>
          </>
        ))}

      {tab === "stores" &&
        (favs.stores.length === 0 ? (
          <EmptyState
            icon={<Heart className="size-8 text-primary" />}
            title="لا توجد متاجر مفضلة بعد"
            hint="اضغط على أيقونة القلب على أي متجر لإضافته هنا."
            action={
              <Link to="/map" className="btn-primary">
                استكشف الخريطة
              </Link>
            }
          />
        ) : (
          <>
            {stores.isLoading && <ListSkeleton count={3} />}
            <div className="space-y-3">
              {(stores.data ?? []).map((s) => (
                <StoreCard key={s.id} s={s} distance={storeDistance(s, pos)} />
              ))}
            </div>
          </>
        ))}
    </div>
  );
}