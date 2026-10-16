import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  Clock,
  Eye,
  Image,
  MapPin,
  Package,
  PackagePlus,
  Pencil,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  becomeMerchant,
  fetchMyStore,
  fetchStoreOrderItems,
  fetchStoreReservations,
  merchantAddOfferImages,
  merchantConfirmAll,
  merchantConfirmReservation,
  merchantCreateStore,
  merchantDeleteOffer,
  merchantQuickAddProduct,
  merchantRemoveOfferImage,
  merchantReplaceOfferImage,
  merchantSetPrimaryImage,
  merchantToggleAvailability,
  merchantUpdateOffer,
  merchantUpdateOrderStatus,
  merchantUpdateProduct,
  fetchMyRoles,
  primaryImage,
  type OfferFull,
} from "@/lib/sooqy";
import { ImageUploader, type ImageUploaderItem } from "@/components/sooqy/image-uploader";
import { formatDA, geoErrorMessage, getStoreStatus, useGeo } from "@/lib/geo";
import {
  DEFAULT_CATEGORY_ID,
  MAIN_CATEGORIES,
  OTHER_CATEGORIES,
  childrenOf,
  parentOf,
  resolveCategoryId,
} from "@/lib/taxonomy";
import { MainCategoryPicker, SubcategoryMultiSelect } from "@/components/sooqy/category-tiles";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { DirectionsButton } from "@/components/sooqy/DirectionsButton";
import { ConfirmDialog } from "@/components/sooqy/confirm-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/")({
  head: () => ({
    meta: [
      { title: "SOOQY Business — استوديو التاجر" },
      { name: "description", content: "أدر مخزونك، حجوزاتك، وطلبات متجرك." },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"offers" | "orders">("offers");
  const [pendingDelete, setPendingDelete] = useState<OfferFull | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    wilaya_id: null as number | null,
    commune: "",
    address_line: "",
    open: "09:00",
    close: "18:00",
    latitude: null as number | null,
    longitude: null as number | null,
    category: null as string | null,
    subcategories: [] as string[],
  });
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    stock: "",
    category: DEFAULT_CATEGORY_ID,
    brand: "",
    description: "",
    sizes: "",
    colors: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState<OfferFull | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    stock: "",
    category: DEFAULT_CATEGORY_ID,
    brand: "",
    description: "",
  });
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editExistingImages, setEditExistingImages] = useState<ImageUploaderItem[]>([]);
  const [managingImageOfferId, setManagingImageOfferId] = useState<string | null>(null);
  const [managingImages, setManagingImages] = useState<ImageUploaderItem[]>([]);

  const roles = useQuery({ queryKey: ["my-roles"], queryFn: fetchMyRoles, enabled: !!user });
  const store = useQuery({ queryKey: ["my-store"], queryFn: fetchMyStore, enabled: !!user });
  const offers = useQuery({
    queryKey: ["my-store-offers", store.data?.id],
    queryFn: async () => {
      const sid = store.data?.id;
      if (!sid) return [];
      const data = await import("@/lib/sooqy").then((m) => m.getStoreOffers(sid));
      return data;
    },
    enabled: !!store.data,
  });
  const reservations = useQuery({
    queryKey: ["store-reservations", store.data?.id],
    queryFn: async () => {
      const sid = store.data?.id;
      if (!sid) return [];
      return import("@/lib/sooqy").then((m) => m.fetchStoreReservations(sid));
    },
    enabled: !!store.data,
  });
  const orders = useQuery({
    queryKey: ["store-orders", store.data?.id],
    queryFn: async () => {
      const sid = store.data?.id;
      if (!sid) return [];
      return import("@/lib/sooqy").then((m) => m.fetchStoreOrderItems(sid));
    },
    enabled: !!store.data,
  });
  const canManage = roles.data?.includes("merchant") || !!store.data;

  if (!ready) return null;
  if (!user) {
    return <AuthGate onLogin={() => navigate({ to: "/auth", search: { redirect: "/studio" } })} />;
  }
  if (store.isLoading || roles.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!canManage || !store.data) {
    return (
      <MerchantOnboarding
        onSubmit={async (input) => {
          await becomeMerchant(); // يضمن دور التاجر (idempotent) قبل إنشاء المتجر
          await merchantCreateStore(input);
          await qc.invalidateQueries({ queryKey: ["my-store"] });
          await store.refetch();
        }}
        form={storeForm}
        setForm={setStoreForm}
      />
    );
  }

  const refreshStock = async () => {
    if (!store.data) return;
    setBusy(true);
    try {
      const updated = await merchantConfirmAll(store.data.id);
      toast.success(`${updated} منتج تم تحديثه اليوم`);
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث المخزون.");
    } finally {
      setBusy(false);
    }
  };

  const confirmReservation = async () => {
    const clean = code.trim();
    if (!clean) {
      toast.error("اكتب كود الحجز أولاً.");
      return;
    }
    try {
      await merchantConfirmReservation(clean);
      toast.success("تم تأكيد الاستلام ✅");
      setCode("");
      await qc.invalidateQueries({ queryKey: ["store-reservations", store.data?.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "كود الحجز غير صالح.");
    }
  };

  const addProduct = async () => {
    if (!store.data) return;
    const clean = productForm.name.trim();
    if (!clean || !productForm.price || !Number(productForm.stock)) {
      toast.error("املأ اسم المنتج والسعر والكمية.");
      return;
    }
    setBusy(true);
    try {
      const sizes = productForm.sizes
        .split(/[،,]/)
        .map((v) => v.trim())
        .filter(Boolean);
      const colors = productForm.colors
        .split(/[،,]/)
        .map((v) => v.trim())
        .filter(Boolean);
      await merchantQuickAddProduct(
        {
          storeId: store.data.id,
          name: clean,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
          category: productForm.category,
          ...(productForm.brand.trim() ? { brand: productForm.brand.trim() } : {}),
          ...(productForm.description.trim()
            ? { description: productForm.description.trim() }
            : {}),
          ...(sizes.length ? { sizes } : {}),
          ...(colors.length ? { colors } : {}),
        },
        images.length ? images : null,
      );
      toast.success("تمت إضافة المنتج بنجاح");
      setProductForm({
        name: "",
        price: "",
        stock: "",
        category: DEFAULT_CATEGORY_ID,
        brand: "",
        description: "",
        sizes: "",
        colors: "",
      });
      setImages([]);
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إضافة المنتج.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (o: OfferFull) => {
    setEditing(o);
    setEditForm({
      name: o.product.name,
      price: String(o.price),
      stock: String(o.stock_quantity),
      category: o.product.category,
      brand: o.product.brand ?? "",
      description: o.product.description ?? "",
    });
    setEditImages([]);
    setEditExistingImages(
      (o.images ?? []).map((img) => ({
        file: null as unknown as File,
        preview: img.image_url,
        isPrimary: img.is_primary,
      })),
    );
  };

  const saveEdit = async () => {
    if (!editing) return;
    const clean = editForm.name.trim();
    if (!clean || !editForm.price || !Number(editForm.stock)) {
      toast.error("املأ اسم المنتج والسعر والكمية.");
      return;
    }
    setBusy(true);
    try {
      await merchantUpdateProduct(editing.product_id, {
        name: clean,
        description: editForm.description.trim() || null,
        brand: editForm.brand.trim() || null,
        category: editForm.category,
      });
      await merchantUpdateOffer(editing.id, {
        price: Number(editForm.price),
        stock_quantity: Number(editForm.stock),
      });

      // رفع صور جديدة إن وجدت
      if (editImages.length) {
        await merchantAddOfferImages(editing.id, editImages);
      }

      toast.success("تم تحديث المنتج ✅");
      setEditing(null);
      setEditImages([]);
      setEditExistingImages([]);
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث المنتج.");
    } finally {
      setBusy(false);
    }
  };

  const openImageManagement = (offer: OfferFull) => {
    setManagingImageOfferId(offer.id);
    setManagingImages(
      (offer.images ?? []).map((img) => ({
        id: img.id,
        file: null as unknown as File,
        preview: img.image_url,
        isPrimary: img.is_primary,
      })),
    );
  };

  const closeImageManagement = () => {
    setManagingImageOfferId(null);
    setManagingImages([]);
  };

  const removeManagingImage = async (item: ImageUploaderItem) => {
    if (!managingImageOfferId || !item.id) return;
    try {
      await merchantRemoveOfferImage(item.id);
      setManagingImages((prev) => prev.filter((i) => i.id !== item.id));
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data?.id] });
      toast.success("تم حذف الصورة ✅");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حذف الصورة.");
    }
  };

  const setManagingPrimaryImage = async (item: ImageUploaderItem) => {
    if (!managingImageOfferId || !item.id) return;
    try {
      await merchantSetPrimaryImage(item.id);
      setManagingImages((prev) =>
        prev.map((i) => ({ ...i, isPrimary: i.id === item.id })),
      );
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data?.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديد الصورة الأساسية.");
    }
  };

  const pendingCount =
    (reservations.data?.filter((r) => r.status === "pending").length ?? 0) +
    (orders.data?.filter((o) => o.order.status === "pending").length ?? 0);

  return (
    <div className="space-y-5 px-4 pb-24 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">SOOQY BUSINESS</p>
          <h1 className="text-2xl font-bold">استوديو التاجر</h1>
        </div>
        <div className="rounded-full bg-primary-soft p-2 text-primary-soft-foreground">
          <Store className="size-5" />
        </div>
      </header>

      {/* بطاقة معلومات المتجر */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft">
            {store.data?.logo_url ? (
              <img
                src={store.data.logo_url}
                alt={`شعار ${store.data.name}`}
                className="size-full rounded-2xl object-cover"
              />
            ) : (
              <Store className="size-6 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-base font-extrabold">{store.data?.name}</p>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {store.data?.commune ? `📍 ${store.data.commune}` : "الموقع قيد الإعداد"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {(() => {
                const st = getStoreStatus(store.data?.opening_hours);
                return (
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      st.isOpen ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        st.isOpen ? "bg-success" : "bg-muted-foreground",
                      )}
                    />
                    {st.isOpen ? "مفتوح الآن" : "مغلق حاليًا"}
                  </span>
                );
              })()}
              {store.data?.is_verified && (
                <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                  <ShieldCheck className="size-3" /> موثق
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Link
            to="/studio/settings"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-soft py-2 text-xs font-bold text-primary transition active:scale-95"
          >
            <Settings className="size-3.5" /> تخصيص المتجر
          </Link>
          <Link
            to="/stores/$storeId"
            params={{ storeId: store.data?.id ?? "" }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-soft py-2 text-xs font-bold text-primary transition active:scale-95"
          >
            <Eye className="size-3.5" /> معاينة متجري
          </Link>
          {store.data?.latitude != null && store.data?.longitude != null && (
            <DirectionsButton
              lat={store.data.latitude}
              lng={store.data.longitude}
              label={store.data?.name ?? ""}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary-soft px-3 py-2 text-xs font-bold text-primary"
            >
              <MapPin className="size-3.5" /> الموقع
            </DirectionsButton>
          )}
        </div>
      </section>

      {/* ملخص النشاط */}
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Package className="size-4.5" />
          </span>
          <p className="mt-2 text-xl font-extrabold">{offers.data?.length ?? 0}</p>
          <p className="text-[10px] font-bold text-muted-foreground">المنتجات</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ShoppingBag className="size-4.5" />
          </span>
          <p className="mt-2 text-xl font-extrabold">
            {(orders.data?.filter((o) => o.order.status === "pending").length ?? 0) +
              (reservations.data?.filter((r) => r.status === "pending").length ?? 0)}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground">طلبات جديدة</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Eye className="size-4.5" />
          </span>
          <p className="mt-2 text-xl font-extrabold">
            {offers.data
              ? offers.data.reduce((sum, o) => sum + (o.product.view_count ?? 0), 0)
              : "—"}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground">المشاهدات</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Star className="size-4.5" />
          </span>
          <p className="mt-2 text-xl font-extrabold">
            {store.data?.rating ? Number(store.data.rating).toFixed(1) : "—"}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground">التقييم</p>
        </div>
      </section>

      {/* إكمال إعداد المتجر */}
      {(() => {
        const s = store.data;
        const items = [
          { label: "اسم المتجر", done: !!s?.name },
          { label: "صورة المتجر (الشعار)", done: !!s?.logo_url },
          { label: "إضافة أول منتج", done: (offers.data?.length ?? 0) > 0 },
          { label: "معلومات التواصل (الهاتف)", done: !!s?.phone },
        ];
        const done = items.filter((i) => i.done).length;
        const pct = Math.round((done / items.length) * 100);
        if (pct === 100) return null;
        return (
          <section className="rounded-2xl border border-primary/25 bg-primary-soft/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-foreground">أكمل إعداد متجرك</h2>
              <span className="text-xs font-bold text-primary">{pct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <ul className="mt-3 space-y-1.5">
              {items.map((i) => (
                <li key={i.label} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full",
                      i.done ? "bg-success text-white" : "border border-primary/40 bg-card",
                    )}
                  >
                    {i.done && <Check className="size-2.5" />}
                  </span>
                  <span
                    className={
                      i.done ? "text-muted-foreground line-through" : "font-bold text-foreground"
                    }
                  >
                    {i.label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Link
                to="/studio/settings"
                className="flex-1 rounded-xl bg-primary py-2 text-center text-xs font-bold text-primary-foreground transition active:scale-95"
              >
                استكمال الإعداد
              </Link>
              <Link
                to="/stores/$storeId"
                params={{ storeId: s?.id ?? "" }}
                className="flex-1 rounded-xl border border-primary/30 bg-card py-2 text-center text-xs font-bold text-primary transition active:scale-95"
              >
                معاينة متجري
              </Link>
            </div>
          </section>
        );
      })()}

      {/* زر الإجراء الأساسي */}
      <button
        onClick={() => setMode("offers")}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground shadow-soft transition active:scale-[0.98]"
      >
        <PackagePlus className="size-5" /> إضافة منتج
      </button>

      {/* قائمة إدارة المتجر */}
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-bold text-muted-foreground">إدارة المتجر</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setMode("offers")}
            className="flex w-full items-center gap-3 p-3.5 text-right transition active:bg-muted/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Package className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">منتجاتي</span>
              <span className="block text-xs text-muted-foreground">
                إضافة المنتجات وتعديلها وحذفها
              </span>
            </span>
            <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setMode("orders")}
            className="flex w-full items-center gap-3 p-3.5 text-right transition active:bg-muted/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <ShoppingBag className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">الطلبات</span>
              <span className="block text-xs text-muted-foreground">
                إدارة الطلبات وتحديث حالاتها
              </span>
            </span>
            {pendingCount > 0 && (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
            <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <Link
            to="/studio/settings"
            className="flex w-full items-center gap-3 p-3.5 text-right transition active:bg-muted/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Store className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">معلومات المتجر</span>
              <span className="block text-xs text-muted-foreground">
                تعديل الاسم والوصف والصور والتصنيف
              </span>
            </span>
            <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            to="/studio/settings"
            className="flex w-full items-center gap-3 p-3.5 text-right transition active:bg-muted/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Clock className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">الموقع وساعات العمل</span>
              <span className="block text-xs text-muted-foreground">إدارة الموقع وأوقات العمل</span>
            </span>
            <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            to="/stores/$storeId"
            params={{ storeId: store.data?.id ?? "" }}
            className="flex w-full items-center gap-3 p-3.5 text-right transition active:bg-muted/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Eye className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">معاينة متجري</span>
              <span className="block text-xs text-muted-foreground">
                عرض الصفحة كما يراها العميل
              </span>
            </span>
            <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      </section>

      {/* تبويب المنتجات */}
      {mode === "offers" && (
        <section className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={refreshStock}
              disabled={busy}
              className="flex-1 rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
            >
              تحديث كل المنتجات اليوم
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <PackagePlus className="size-5 text-primary" /> إضافة منتج في 30 ثانية
            </h2>
            <div className="grid gap-3">
              <input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="اسم المنتج"
                className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="السعر دج"
                  type="number"
                  min="0"
                  className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  placeholder="الكمية"
                  type="number"
                  min="0"
                  className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <CategorySelect
                value={productForm.category}
                onChange={(category) => setProductForm({ ...productForm, category })}
              />
              <input
                value={productForm.brand}
                onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                placeholder="العلامة التجارية"
                className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={productForm.sizes}
                onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                placeholder="المقاسات: S, M, L"
                className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={productForm.colors}
                onChange={(e) => setProductForm({ ...productForm, colors: e.target.value })}
                placeholder="الألوان: أسود، أبيض"
                className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
              />
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="وصف المنتج"
                rows={2}
                className="rounded-xl border border-input bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-indigo-500"
              />
              <ImageUploader
                initialItems={[]}
                onChange={setImages}
                label="إضافة صور المنتج (حتى 10)"
              />
              <button
                onClick={addProduct}
                disabled={busy}
                className="rounded-2xl bg-ink py-3 font-bold text-ink-foreground disabled:opacity-50"
              >
                {busy ? "جارٍ الحفظ..." : "حفظ المنتج"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 font-bold">المنتجات الحالية</h2>

            {editing && (
              <div className="mb-3 rounded-2xl border border-primary/25 bg-primary-soft/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold">
                    <Pencil className="size-3.5 text-primary" /> تعديل المنتج
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-full bg-card p-1.5 text-muted-foreground transition hover:text-foreground"
                    aria-label="إغلاق التحرير"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid gap-2">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="اسم المنتج"
                    className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      placeholder="السعر دج"
                      type="number"
                      min="0"
                      className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      placeholder="الكمية"
                      type="number"
                      min="0"
                      className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <CategorySelect
                    value={editForm.category}
                    onChange={(category) => setEditForm({ ...editForm, category })}
                  />
                  <input
                    value={editForm.brand}
                    onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                    placeholder="العلامة التجارية"
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="وصف المنتج"
                    rows={2}
                    className="rounded-xl border border-input bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-indigo-500"
                  />
                  <ImageUploader
                    initialItems={editExistingImages}
                    onChange={(items) => setEditExistingImages(items)}
                    label="إدارة صور المنتج"
                  />
                  {editImages.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {editImages.length} صورة جديدة سيتم رفعها
                    </p>
                  )}
                  <button
                    onClick={saveEdit}
                    disabled={busy}
                    className="rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                  </button>
                </div>
              </div>
            )}

            {/* إدارة الصور لمنتج محدد */}
            {managingImageOfferId && (
              <div className="mb-4 rounded-2xl border border-primary/25 bg-primary-soft/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold">
                    <Image className="size-3.5 text-primary" /> إدارة صور المنتج
                  </h3>
                  <button
                    type="button"
                    onClick={closeImageManagement}
                    className="rounded-full bg-card p-1.5 text-muted-foreground transition hover:text-foreground"
                    aria-label="إغلاق إدارة الصور"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <ImageUploader
                  initialItems={managingImages}
                  onChange={setManagingImages}
                  label="إدارة صور المنتج (حتى 10)"
                  onRemove={removeManagingImage}
                  onSetPrimary={setManagingPrimaryImage}
                />
              </div>
            )}

            <div className="space-y-2">
              {offers.data?.map((offer) => (
                <div key={offer.id} className="rounded-2xl bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {primaryImage(offer.images) && (
                        <img
                          src={primaryImage(offer.images)!}
                          alt=""
                          className="size-10 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-bold">{offer.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDA(offer.price)} · {offer.stock_quantity} في المخزن
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(offer)}
                        className="rounded-full bg-muted p-2 text-muted-foreground transition hover:bg-primary hover:text-primary-foreground"
                        aria-label="تعديل المنتج"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openImageManagement(offer)}
                        className="rounded-full bg-primary-soft p-2 text-primary transition hover:bg-primary hover:text-primary-foreground"
                        aria-label="إدارة صور المنتج"
                        title="إدارة الصور"
                      >
                        <Image className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await merchantToggleAvailability(offer.id, !offer.is_available);
                          await qc.invalidateQueries({
                            queryKey: ["my-store-offers", store.data?.id],
                          });
                        }}
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold",
                          offer.is_available
                            ? "bg-success-soft text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {offer.is_available ? (
                          <ToggleRight className="size-4" />
                        ) : (
                          <ToggleLeft className="size-4" />
                        )}
                        {offer.is_available ? "متوفر" : "غير متوفر"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(offer)}
                        className="rounded-full bg-danger-soft p-2 text-danger transition hover:bg-danger hover:text-white"
                        aria-label="حذف المنتج"
                        title="حذف المنتج"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!offers.data?.length && (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  لا توجد منتجات بعد.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="حذف المنتج"
        message={`سيُحذف «${pendingDelete?.product.name ?? ""}» نهائيًا من متجرك ولن يظهر للعملاء بعد الآن. طلباتك السابقة تبقى محفوظة.`}
        confirmLabel="حذف نهائي"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={async () => {
          if (!pendingDelete || deleting) return;
          setDeleting(true);
          try {
            await merchantDeleteOffer(pendingDelete.id);
            await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data?.id] });
            toast.success("تم حذف المنتج ✅");
            setPendingDelete(null);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "تعذّر حذف المنتج.");
          } finally {
            setDeleting(false);
          }
        }}
      />

      {mode === "orders" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 font-bold">تأكيد الحجز</h2>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SQ-XXXX"
                className="h-11 flex-1 rounded-xl border bg-background px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <button
                onClick={confirmReservation}
                className="rounded-xl bg-primary px-4 font-bold text-primary-foreground shadow-sm transition hover:brightness-95"
              >
                تأكيد
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 font-bold">الحجوزات</h2>
            <div className="space-y-2">
              {reservations.data?.map((r) => (
                <div key={r.id} className="rounded-2xl bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-primary">{r.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.offer?.product?.name ?? "منتج محذوف"} · {r.quantity} وحدة
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-bold",
                        r.status === "pending"
                          ? "bg-warning-soft text-warning"
                          : r.status === "collected"
                            ? "bg-success-soft text-success"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {r.status === "pending"
                        ? "في الانتظار"
                        : r.status === "collected"
                          ? "تم الاستلام"
                          : r.status === "cancelled"
                            ? "ملغي"
                            : "منتهي"}
                    </span>
                  </div>
                  {r.status === "pending" && (
                    <button
                      onClick={async () => {
                        try {
                          await merchantConfirmReservation(r.code);
                          toast.success("تم تأكيد الاستلام ✅");
                          await qc.invalidateQueries({
                            queryKey: ["store-reservations", store.data?.id],
                          });
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "تعذر التأكيد.");
                        }
                      }}
                      className="mt-2 w-full rounded-xl bg-success-soft py-2 text-xs font-bold text-success transition hover:bg-success/25"
                    >
                      تأكيد الاستلام
                    </button>
                  )}
                </div>
              ))}
              {!reservations.data?.length && (
                <p className="text-sm text-muted-foreground">لا توجد حجوزات.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 font-bold">طلبات التوصيل</h2>
            {(() => {
              const soldTotal = (orders.data ?? []).reduce(
                (sum, i) => sum + i.unit_price * i.quantity,
                0,
              );
              const rate = store.data?.commission_rate ?? 7;
              const commission = Math.round((soldTotal * rate) / 100);
              return soldTotal > 0 ? (
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-muted p-3 text-center">
                    <p className="text-base font-bold">{formatDA(soldTotal)}</p>
                    <p className="text-[10px] text-muted-foreground">مبيعات المتجر</p>
                  </div>
                  <div className="rounded-2xl bg-muted p-3 text-center">
                    <p className="text-base font-bold">{formatDA(commission)}</p>
                    <p className="text-[10px] text-muted-foreground">عمولة SOOQY ({rate}%)</p>
                  </div>
                  <div className="rounded-2xl bg-success-soft p-3 text-center">
                    <p className="text-base font-bold text-success">
                      {formatDA(soldTotal - commission)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">صافي المستحق</p>
                  </div>
                </div>
              ) : null;
            })()}
            <div className="space-y-2">
              {orders.data?.map((item) => (
                <div key={item.id} className="rounded-2xl bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{item.order.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.order.commune} · {item.order.delivery_type}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary-soft px-2 py-1 text-[10px] font-bold text-primary-soft-foreground">
                      {item.order.status}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {(["confirmed", "shipped", "delivered", "cancelled"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={async () => {
                          await merchantUpdateOrderStatus(item.order.id, status);
                          await qc.invalidateQueries({
                            queryKey: ["store-orders", store.data?.id],
                          });
                        }}
                        className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold transition hover:bg-primary hover:text-primary-foreground"
                      >
                        {status === "confirmed"
                          ? "تأكيد"
                          : status === "shipped"
                            ? "شحن"
                            : status === "delivered"
                              ? "تسليم"
                              : "إلغاء"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!orders.data?.length && (
                <p className="text-sm text-muted-foreground">لا توجد طلبات بعد.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AuthGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="space-y-4 px-4 pt-20 text-center">
      <Store className="mx-auto size-12 text-primary" />
      <h1 className="text-2xl font-bold">لوحة التاجر</h1>
      <p className="text-sm text-muted-foreground">سجّل الدخول لعرض المخزون والحجوزات.</p>
      <button
        onClick={onLogin}
        className="rounded-2xl bg-primary px-8 py-3 font-bold text-primary-foreground"
      >
        دخول
      </button>
    </div>
  );
}

type StoreForm = {
  name: string;
  phone: string;
  whatsapp: string;
  wilaya_id: number | null;
  commune: string;
  address_line: string;
  open: string;
  close: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  subcategories: string[];
};

const CATEGORY_FIELD_CLS =
  "h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500";

/**
 * منتقي تصنيف ثنائي المستوى: تصنيف رئيسي (أو تصنيف من «تصنيفات أخرى») ثم الفئة الفرعية.
 * ما يُخزَّن في `products.category` هو الفئة الفرعية، أو التصنيف الرئيسي إن لم تكن له فرعيات.
 */
function CategorySelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const resolved = resolveCategoryId(value);
  const main = parentOf(resolved)?.id ?? MAIN_CATEGORIES[0]!.id;
  const subs = childrenOf(main);
  const subValue = subs.some((c) => c.id === resolved) ? resolved : (subs[0]?.id ?? main);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={main}
          aria-label="التصنيف الرئيسي"
          onChange={(e) => {
            const next = e.target.value;
            onChange(childrenOf(next)[0]?.id ?? next);
          }}
          className={CATEGORY_FIELD_CLS}
        >
          {MAIN_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
          <optgroup label="تصنيفات أخرى">
            {OTHER_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
        </select>
        <select
          value={subValue}
          aria-label="الفئة الفرعية"
          onChange={(e) => onChange(e.target.value)}
          className={CATEGORY_FIELD_CLS}
        >
          {subs.length === 0 ? (
            <option value={main}>لا توجد فئات فرعية</option>
          ) : (
            subs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))
          )}
        </select>
      </div>
      <p className="text-[11px] text-muted-foreground">تصنيف المنتج مستقل عن تصنيف متجرك.</p>
    </div>
  );
}

function MerchantOnboarding({
  onSubmit,
  form,
  setForm,
}: {
  onSubmit: (input: Parameters<typeof merchantCreateStore>[0]) => Promise<void>;
  form: StoreForm;
  setForm: React.Dispatch<React.SetStateAction<StoreForm>>;
}) {
  const [busy, setBusy] = useState(false);
  const { ask, locating } = useGeo();

  const locate = async () => {
    const { pos: found, reason: why } = await ask();
    if (!found) {
      toast.error(geoErrorMessage(why));
      return;
    }
    setForm((f) => ({ ...f, latitude: found.lat, longitude: found.lng }));
    toast.success("تم تحديد موقع المتجر 📍");
  };

  const submit = async () => {
    if (!form.name || !form.phone || !form.wilaya_id || !form.commune || !form.address_line) {
      toast.error("املأ بيانات المتجر المطلوبة.");
      return;
    }
    if (!form.category) {
      toast.error("اختر التصنيف الرئيسي لمتجرك.");
      return;
    }
    setBusy(true);
    try {
      // الإحداثيات تُحفظ فقط إذا اكتمل الزوج (خط عرض + خط طول)
      const hasCoords = form.latitude != null && form.longitude != null;
      await onSubmit({
        ...form,
        wilaya_id: form.wilaya_id ?? 0,
        latitude: hasCoords ? form.latitude : null,
        longitude: hasCoords ? form.longitude : null,
      });
      toast.success("تم فتح المتجر بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر فتح المتجر.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 px-4 pb-24 pt-6">
      <div>
        <p className="text-sm text-muted-foreground">ابدأ متجرك</p>
        <h1 className="text-2xl font-bold">أنشئ متجر SOOQY</h1>
      </div>
      <div className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="اسم المتجر"
          className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="هاتف المتجر"
          className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
        />
        <input
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="واتساب"
          className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
        />
        <WilayaSelect
          value={form.wilaya_id}
          onChange={(wilaya_id) => setForm({ ...form, wilaya_id })}
          required
          className="h-11 w-full"
        />
        <input
          value={form.commune}
          onChange={(e) => setForm({ ...form, commune: e.target.value })}
          placeholder="البلدية"
          className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
        />
        <textarea
          value={form.address_line}
          onChange={(e) => setForm({ ...form, address_line: e.target.value })}
          rows={3}
          placeholder="العنوان"
          className="w-full rounded-xl border border-input bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-indigo-500"
        />

        {/* تصنيف المتجر: رئيسي واحد على الأقل + فئات فرعية اختيارية */}
        <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-3">
          <div>
            <p className="text-sm font-bold text-foreground">تصنيف المتجر</p>
            <p className="text-[11px] text-muted-foreground">
              اختر التصنيف الرئيسي لنشاطك، ثم الفئات الفرعية التي تبيعها.
            </p>
          </div>
          <MainCategoryPicker
            value={form.category}
            onChange={(category) =>
              setForm((f) => ({
                ...f,
                category,
                subcategories: f.subcategories.filter((x) =>
                  childrenOf(category).some((c) => c.id === x),
                ),
              }))
            }
          />
          {form.category && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">الفئات الفرعية (اختيارية)</p>
              <SubcategoryMultiSelect
                categoryId={form.category}
                value={form.subcategories}
                onToggle={(id) =>
                  setForm((f) => ({
                    ...f,
                    subcategories: f.subcategories.includes(id)
                      ? f.subcategories.filter((x) => x !== id)
                      : [...f.subcategories, id],
                  }))
                }
              />
            </div>
          )}
        </div>

        {/* موقع المتجر على الخريطة — اختياري */}
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary-soft/30 p-3">
          <p className="mb-1 text-xs font-bold text-primary">
            📍 موقع المتجر على الخريطة <span className="font-medium">(اختياري)</span>
          </p>
          <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
            يمكنك فتح المتجر الآن دون تحديد الموقع، وإضافته لاحقًا من «تخصيص المتجر». المتاجر بدون
            موقع تعمل عادةً، لكنها لا تظهر على الخريطة.
          </p>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {locating ? "جارٍ تحديد الموقع..." : "تحديد موقعي الحالي"}
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              value={form.latitude ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  latitude: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="خط العرض"
              inputMode="decimal"
              dir="ltr"
              className="h-10 rounded-lg border border-input bg-background px-2 text-left text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={form.longitude ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  longitude: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="خط الطول"
              inputMode="decimal"
              dir="ltr"
              className="h-10 rounded-lg border border-input bg-background px-2 text-left text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {form.latitude != null && form.longitude != null && (
            <p className="mt-2 text-[11px] font-bold text-success">✓ سيظهر متجرك على الخريطة</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="time"
            value={form.open}
            onChange={(e) => setForm({ ...form, open: e.target.value })}
            className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="time"
            value={form.close}
            onChange={(e) => setForm({ ...form, close: e.target.value })}
            className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "جارٍ الإعداد..." : "فتح المتجر"}
        </button>
      </div>
    </div>
  );
}
