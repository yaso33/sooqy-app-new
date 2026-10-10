import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ImagePlus,
  PackagePlus,
  Pencil,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  becomeMerchant,
  fetchMyStore,
  fetchStoreOrderItems,
  fetchStoreReservations,
  merchantConfirmAll,
  merchantConfirmReservation,
  merchantCreateStore,
  merchantQuickAddProduct,
  merchantReplaceOfferImage,
  merchantToggleAvailability,
  merchantUpdateOffer,
  merchantUpdateOrderStatus,
  merchantUpdateProduct,
  fetchMyRoles,
  primaryImage,
  type OfferFull,
} from "@/lib/sooqy";
import { formatDA, geoErrorMessage, useGeo } from "@/lib/geo";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
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
  });
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    stock: "",
    category: "shoes",
    brand: "",
    description: "",
    sizes: "",
    colors: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<OfferFull | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    stock: "",
    category: "shoes",
    brand: "",
    description: "",
  });
  const [editImage, setEditImage] = useState<File | null>(null);

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
        image,
      );
      toast.success("تمت إضافة المنتج بنجاح");
      setProductForm({
        name: "",
        price: "",
        stock: "",
        category: "shoes",
        brand: "",
        description: "",
        sizes: "",
        colors: "",
      });
      setImage(null);
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
    setEditImage(null);
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
      if (editImage) await merchantReplaceOfferImage(editing.id, editImage);
      toast.success("تم تحديث المنتج ✅");
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["my-store-offers", store.data.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث المنتج.");
    } finally {
      setBusy(false);
    }
  };

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

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-1 font-bold">{store.data?.name ?? "متجرك"}</p>
            <p className="text-xs text-muted-foreground">{store.data?.commune ?? "قيد الإعداد"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {store.data?.is_verified && (
              <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-xs font-bold text-success">
                <ShieldCheck className="size-3.5" /> موثق
              </span>
            )}
            <Link
              to="/studio/settings"
              className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary-soft-foreground transition active:scale-95"
            >
              <Settings className="size-3.5" /> تخصيص المتجر
            </Link>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="منتجات" value={String(offers.data?.length ?? 0)} />
          <Stat
            label="حجوزات معلقة"
            value={String(reservations.data?.filter((r) => r.status === "pending").length ?? 0)}
          />
          <Stat label="طلبات" value={String(orders.data?.length ?? 0)} />
        </div>
      </section>

      <section className="rounded-3xl bg-card p-3 shadow-soft">
        <div className="grid grid-cols-2 gap-2">
          <ModeButton
            active={mode === "offers"}
            label="المنتجات"
            onClick={() => setMode("offers")}
            icon={ShoppingBag}
          />
          <ModeButton
            active={mode === "orders"}
            label="الطلبات والحجوزات"
            onClick={() => setMode("orders")}
            icon={Sparkles}
            badge={
              (reservations.data?.filter((r) => r.status === "pending").length ?? 0) +
              (orders.data?.filter((o) => o.order.status === "pending").length ?? 0)
            }
          />
        </div>
      </section>

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
                className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="السعر دج"
                  type="number"
                  min="0"
                  className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
                />
                <input
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  placeholder="الكمية"
                  type="number"
                  min="0"
                  className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
                >
                  <option value="shoes">أحذية</option>
                  <option value="phones">هواتف</option>
                  <option value="cosmetics">مستحضرات التجميل</option>
                  <option value="clothes">ملابس</option>
                  <option value="capsules">كبسولات</option>
                  <option value="other">أخرى</option>
                </select>
                <input
                  value={productForm.brand}
                  onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  placeholder="العلامة التجارية"
                  className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
                />
              </div>
              <input
                value={productForm.sizes}
                onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                placeholder="المقاسات: S, M, L"
                className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
              />
              <input
                value={productForm.colors}
                onChange={(e) => setProductForm({ ...productForm, colors: e.target.value })}
                placeholder="الألوان: أسود، أبيض"
                className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
              />
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="وصف المنتج"
                rows={2}
                className="rounded-xl border border-input bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-background p-3 text-sm"
              >
                <ImagePlus className="size-4 text-primary" />
                {image ? image.name : "رفع صورة المنتج"}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                className="hidden"
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
                    className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      placeholder="السعر دج"
                      type="number"
                      min="0"
                      className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
                    />
                    <input
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      placeholder="الكمية"
                      type="number"
                      min="0"
                      className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
                    >
                      <option value="shoes">أحذية</option>
                      <option value="phones">هواتف</option>
                      <option value="cosmetics">مستحضرات التجميل</option>
                      <option value="clothes">ملابس</option>
                      <option value="capsules">كبسولات</option>
                      <option value="other">أخرى</option>
                    </select>
                    <input
                      value={editForm.brand}
                      onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                      placeholder="العلامة التجارية"
                      className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="وصف المنتج"
                    rows={2}
                    className="rounded-xl border border-input bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => editImageInputRef.current?.click()}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-background p-2.5 text-sm"
                  >
                    <ImagePlus className="size-4 text-primary" />
                    {editImage ? editImage.name : "تغيير صورة المنتج"}
                  </button>
                  <input
                    ref={editImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditImage(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
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
                        {r.offer?.product?.name} · {r.quantity} وحدة
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
};

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
    setBusy(true);
    try {
      await onSubmit({
        ...form,
        wilaya_id: form.wilaya_id ?? 0,
        latitude: form.latitude,
        longitude: form.longitude,
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
          className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="هاتف المتجر"
          className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
        />
        <input
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="واتساب"
          className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
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
          className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={form.address_line}
          onChange={(e) => setForm({ ...form, address_line: e.target.value })}
          rows={3}
          placeholder="العنوان"
          className="w-full rounded-xl border border-input bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
        />

        {/* موقع المتجر على الخريطة */}
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary-soft/30 p-3">
          <p className="mb-2 text-xs font-bold text-primary">📍 موقع المتجر على الخريطة</p>
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
              className="h-10 rounded-lg border border-input bg-background px-2 text-left text-xs outline-none focus:ring-2 focus:ring-ring"
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
              className="h-10 rounded-lg border border-input bg-background px-2 text-left text-xs outline-none focus:ring-2 focus:ring-ring"
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
            className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
          />
          <input
            type="time"
            value={form.close}
            onChange={(e) => setForm({ ...form, close: e.target.value })}
            className="h-11 rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ModeButton({
  active,
  label,
  onClick,
  icon: Icon,
  badge,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: typeof ShoppingBag;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
      {badge ? (
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
            active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-danger text-white",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
