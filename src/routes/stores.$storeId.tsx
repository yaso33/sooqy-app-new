import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  Clock,
  Eye,
  Facebook,
  Heart,
  Instagram,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Settings,
  Share2,
  Star,
  Store,
} from "lucide-react";
import { formatDA, isOpenNow, useGeo, type OpeningHours } from "@/lib/geo";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  categoryLabel,
  getStore,
  getStoreOffers,
  primaryImage,
  stockLevel,
  storeDistance,
} from "@/lib/sooqy";
import { useFavorites, toggleFavorite } from "@/lib/favorites";
import { OpenBadge, StockBadge, VerifiedBadge } from "@/components/sooqy/badges";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ReviewSection } from "@/components/sooqy/ReviewSection";
import { DirectionsButton } from "@/components/sooqy/DirectionsButton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stores/$storeId")({
  head: () => ({
    meta: [
      { title: "المتجر — SooQy" },
      { name: "description", content: "شاهد جميع سلع المتجر وأسعاره ومواعيد العمل." },
    ],
  }),
  component: StorePage,
});

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
type Tab = "products" | "about" | "reviews";

/** يكمل الرابط إن أُدخل بدون بروتوكول (instagram.com/... أو @handle). */
function socialHref(url: string) {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

function StorePage() {
  const { storeId } = Route.useParams();
  const router = useRouter();
  const { pos } = useGeo();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("products");
  const favs = useFavorites();
  const store = useQuery({ queryKey: ["store", storeId], queryFn: () => getStore(storeId) });
  const offers = useQuery({
    queryKey: ["store-offers", storeId],
    queryFn: () => getStoreOffers(storeId),
  });

  if (store.isLoading)
    return (
      <div className="space-y-3 p-4">
        <div className="h-44 animate-pulse rounded-3xl bg-card" />
        <div className="h-24 animate-pulse rounded-2xl bg-card" />
        <div className="h-64 animate-pulse rounded-2xl bg-card" />
      </div>
    );

  const s = store.data;
  if (!s) return <p className="p-8 text-center">المتجر غير موجود</p>;
  const oh = (s.opening_hours ?? {}) as OpeningHours;
  const open = isOpenNow(s.opening_hours);
  const distance = storeDistance(s, pos);
  const followed = favs.stores.includes(s.id);
  // مالِك المتجر يرى صفحته كما يراها الزائر + شريط اختصارات إدارية
  const isOwner = !!user && s.owner_id === user.id;

  const byCat = new Map<string, NonNullable<typeof offers.data>>();
  for (const o of offers.data ?? []) {
    const k = o.product.category;
    byCat.set(k, [...(byCat.get(k) ?? []), o]);
  }

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.share({ title: s.name, text: s.name, url });
    } catch {
      /* أُلغيت المشاركة */
    }
  };

  return (
    <div className="pb-6">
      {/* شريط المالك — يظهر لك وحدك، والزوار لا يرونه */}
      {isOwner && (
        <div className="flex flex-wrap items-center gap-2 bg-primary-soft px-4 py-2.5 text-primary-soft-foreground">
          <Eye className="size-4 shrink-0" />
          <p className="min-w-0 flex-1 text-xs font-bold">أنت تشاهد متجرك كما يراه الزوار</p>
          <Link
            to="/studio/settings"
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground transition active:scale-95"
          >
            <Settings className="size-3.5" /> تخصيص
          </Link>
          <Link
            to="/studio"
            className="flex items-center gap-1 rounded-full border border-primary/40 px-3 py-1 text-xs font-bold transition active:scale-95"
          >
            <Store className="size-3.5" /> لوحة التحكم
          </Link>
        </div>
      )}

      {/* الغلاف */}
      <div className="relative h-44 bg-neutral-100 dark:bg-neutral-800">
        {s.cover_url && (
          <img
            src={s.cover_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        )}
        <button
          onClick={() => router.history.back()}
          aria-label="رجوع"
          className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-card/95 shadow-soft backdrop-blur transition active:scale-95"
        >
          <ArrowRight className="size-5" />
        </button>
        <button
          onClick={share}
          aria-label="مشاركة المتجر"
          className="absolute top-4 left-4 z-10 flex size-10 items-center justify-center rounded-full bg-card/95 shadow-soft backdrop-blur transition active:scale-95"
        >
          <Share2 className="size-5" />
        </button>
        <div className="absolute -bottom-9 right-4 size-[72px] overflow-hidden rounded-2xl border-4 border-background bg-card shadow-soft">
          {s.logo_url ? (
            <img src={s.logo_url} alt={s.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-2xl font-bold text-primary">
              {s.name[0]}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 pt-11">
        {/* الاسم والحالة */}
        <div className="space-y-1.5">
          <h1 className="text-h1 text-foreground">{s.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <OpenBadge open={open} />
            {s.is_verified && <VerifiedBadge />}
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Star className="size-3 fill-warning text-warning" /> {Number(s.rating).toFixed(1)}
            </span>
            {distance != null && (
              <span className="flex items-center gap-0.5 font-bold text-ink">
                <MapPin className="size-3 text-muted-foreground" /> {distance}
              </span>
            )}
          </div>
        </div>

        {/* الأزرار */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              const nowFollowing = toggleFavorite("stores", s.id);
              toast.success(
                nowFollowing ? "أُضيف المتجر إلى مفضلتك ❤️" : "أُزيل المتجر من المفضلة",
              );
            }}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-bold transition active:scale-95",
              followed
                ? "border-primary bg-primary-soft text-primary-soft-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            <Heart className={cn("size-4", followed && "fill-primary text-primary")} />
            {followed ? "إلغاء المتابعة" : "متابعة المتجر"}
          </button>
          <DirectionsButton
            lat={s.latitude}
            lng={s.longitude}
            label={s.name}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-sm font-bold"
          >
            <Navigation className="size-4" />
            الاتجاهات
          </DirectionsButton>
          <a
            href={`https://wa.me/${(s.whatsapp ?? "").replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-success text-sm font-bold text-white transition active:scale-95"
          >
            <MessageCircle className="size-4" />
            واتساب
          </a>
        </div>

        {/* التبويبات */}
        <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur">
          <div className="flex gap-1">
            {(
              [
                { id: "products", label: "المنتجات" },
                { id: "about", label: "حول المتجر" },
                { id: "reviews", label: "التقييمات" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex-1 py-3 text-sm font-bold transition",
                  tab === t.id ? "text-primary" : "text-muted-foreground",
                )}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* المنتجات */}
        {tab === "products" && (
          <div className="space-y-4">
            {[...byCat.entries()].map(([cat, list]) => (
              <section key={cat} className="space-y-2">
                <h2 className="text-h3 text-foreground">{categoryLabel(cat)}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {list.map((o) => (
                    <Link
                      key={o.id}
                      to="/products/$productId"
                      params={{ productId: o.product_id }}
                      className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-soft"
                    >
                      <div className="relative aspect-square bg-neutral-100">
                        {primaryImage(o.images) && (
                          <img
                            src={primaryImage(o.images)!}
                            alt={o.product.name}
                            loading="lazy"
                            className="size-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        )}
                        <StockBadge
                          level={stockLevel(o)}
                          className="absolute top-2 right-2 bg-card/95"
                        />
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-1 text-sm font-semibold">{o.product.name}</p>
                        <p className="text-price text-ink">{formatDA(o.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            {!offers.isLoading && !offers.data?.length && (
              <EmptyState
                icon="🏪"
                title={isOwner ? "متجرك لا يعرض أي سلعة بعد" : "لم يضف المتجر أي سلعة بعد"}
                hint={
                  isOwner
                    ? "أضف منتجك الأول من لوحة التحكم ليظهر هنا للزوار."
                    : "ترقّب وصول منتجات جديدة قريبًا."
                }
                action={
                  isOwner ? (
                    <Link to="/studio" className="btn-primary inline-flex items-center gap-1.5">
                      <Plus className="size-4" /> أضف منتجًا
                    </Link>
                  ) : undefined
                }
              />
            )}
          </div>
        )}

        {/* حول المتجر */}
        {tab === "about" && (
          <div className="space-y-4">
            {s.description && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-body text-foreground">{s.description}</p>
              </div>
            )}
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-h3 text-foreground">الموقع</h3>
              <p className="mt-2 flex items-start gap-2 text-body text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                {[s.address_line, s.commune].filter(Boolean).join("، ")}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-h3 text-foreground">
                  <Clock className="size-4 text-primary" /> ساعات العمل
                </h3>
                <OpenBadge open={open} />
              </div>
              <div className="mt-3 space-y-1.5">
                {DAYS.map((d, i) => {
                  const closed = oh.closed_days?.includes(i);
                  return (
                    <div key={d} className="flex items-center justify-between text-sm">
                      <span className={closed ? "text-muted-foreground/60" : ""}>{d}</span>
                      <span
                        className={
                          closed
                            ? "font-semibold text-danger"
                            : i === new Date().getDay()
                              ? "font-bold text-primary"
                              : "font-semibold text-foreground"
                        }
                      >
                        {closed ? "مغلق" : `${oh.open} - ${oh.close}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-h3 text-foreground">التواصل</h3>
              {s.phone && (
                <a
                  href={`tel:${s.phone}`}
                  className="mt-2 flex items-center gap-2 text-body text-muted-foreground"
                >
                  <Phone className="size-4 text-primary" /> {s.phone}
                </a>
              )}
              {s.whatsapp && (
                <a
                  href={`https://wa.me/${(s.whatsapp ?? "").replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-2 text-body text-muted-foreground"
                >
                  <MessageCircle className="size-4 text-success" /> واتساب
                </a>
              )}
              {(s.instagram_url || s.facebook_url) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.instagram_url && (
                    <a
                      href={socialHref(s.instagram_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <Instagram className="size-3.5" /> إنستغرام
                    </a>
                  )}
                  {s.facebook_url && (
                    <a
                      href={socialHref(s.facebook_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <Facebook className="size-3.5" /> فيسبوك
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* التقييمات */}
        {tab === "reviews" && (
          <ReviewSection targetType="store" targetId={s.id} title="تقييمات المتجر" />
        )}
      </div>
    </div>
  );
}
