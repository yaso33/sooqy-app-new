import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, MapPin, Save, Store } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchMyStore, merchantUpdateStore, uploadImageToBucket } from "@/lib/sooqy";
import { childrenOf } from "@/lib/taxonomy";
import {
  MainCategoryPicker,
  SubcategoryMultiSelect,
} from "@/components/sooqy/category-tiles";
import { geoErrorMessage, useGeo } from "@/lib/geo";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { PageHeader } from "@/components/sooqy/page-header";
import { cn } from "@/lib/utils";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const Route = createFileRoute("/studio/settings")({
  head: () => ({
    meta: [
      { title: "تخصيص المتجر — SooQy" },
      { name: "description", content: "عدّل وصف متجرك وشعاره وغلافه وساعات عمله." },
    ],
  }),
  component: StoreSettingsPage,
});

function StoreSettingsPage() {
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const { ask, locating } = useGeo();
  const store = useQuery({ queryKey: ["my-store"], queryFn: fetchMyStore, enabled: !!user });

  const locate = async () => {
    const { pos: found, reason: why } = await ask();
    if (!found) {
      toast.error(geoErrorMessage(why));
      return;
    }
    setForm((f) => ({ ...f, latitude: found.lat, longitude: found.lng }));
    toast.success("تم تحديد موقع المتجر 📍");
  };

  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    whatsapp: "",
    wilaya_id: null as number | null,
    commune: "",
    address_line: "",
    open: "09:00",
    close: "18:00",
    instagram: "",
    facebook: "",
    latitude: null as number | null,
    longitude: null as number | null,
    category: null as string | null,
    subcategories: [] as string[],
  });
  const [closedDays, setClosedDays] = useState<number[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // تعبئة النموذج من بيانات المتجر الحالية — مرة واحدة
  useEffect(() => {
    if (loaded || !store.data) return;
    const s = store.data;
    const oh = (s.opening_hours ?? {}) as { open?: string; close?: string; closed_days?: number[] };
    setForm({
      name: s.name ?? "",
      description: s.description ?? "",
      phone: s.phone ?? "",
      whatsapp: s.whatsapp ?? "",
      wilaya_id: s.wilaya_id,
      commune: s.commune ?? "",
      address_line: s.address_line ?? "",
      open: oh.open ?? "09:00",
      close: oh.close ?? "18:00",
      instagram: s.instagram_url ?? "",
      facebook: s.facebook_url ?? "",
      latitude: s.latitude ?? null,
      longitude: s.longitude ?? null,
      category: s.category ?? null,
      subcategories: (s.subcategories ?? []) as string[],
    });
    setClosedDays(oh.closed_days ?? []);
    setLogoPreview(s.logo_url ?? null);
    setCoverPreview(s.cover_url ?? null);
    setLoaded(true);
  }, [store.data, loaded]);

  if (!ready) return null;
  if (!user)
    return (
      <div className="space-y-4 px-4 pt-20 text-center">
        <Store className="mx-auto size-12 text-primary" />
        <h1 className="text-2xl font-bold">تخصيص المتجر</h1>
        <p className="text-sm text-muted-foreground">سجّل الدخول لتعديل إعدادات متجرك.</p>
        <Link to="/auth" className="btn-primary mx-auto w-fit px-8">
          دخول
        </Link>
      </div>
    );
  if (!store.isLoading && !store.data)
    return (
      <div className="space-y-4 px-4 pt-20 text-center">
        <Store className="mx-auto size-12 text-primary" />
        <h1 className="text-2xl font-bold">لا يوجد متجر بعد</h1>
        <p className="text-sm text-muted-foreground">أنشئ متجرك أولًا ثم عدّل إعداداته من هنا.</p>
        <Link to="/studio" className="btn-primary mx-auto w-fit px-8">
          إنشاء متجر
        </Link>
      </div>
    );

  const pickFile = (kind: "logo" | "cover") => (f: File | null) => {
    if (kind === "logo") {
      setLogo(f);
      setLogoPreview(f ? URL.createObjectURL(f) : (store.data?.logo_url ?? null));
    } else {
      setCover(f);
      setCoverPreview(f ? URL.createObjectURL(f) : (store.data?.cover_url ?? null));
    }
  };

  const toggleDay = (i: number) =>
    setClosedDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort()));

  const save = async () => {
    if (!store.data) return;
    if (!form.name.trim() || !form.wilaya_id || !form.commune.trim() || !form.address_line.trim()) {
      toast.error("املأ اسم المتجر والولاية والبلدية والعنوان.");
      return;
    }
    setBusy(true);
    try {
      // الإحداثيات تُحفظ فقط إذا اكتمل الزوج (خط عرض + خط طول)
      const hasCoords = form.latitude != null && form.longitude != null;
      let logoUrl = store.data.logo_url ?? null;
      let coverUrl = store.data.cover_url ?? null;
      if (logo) logoUrl = await uploadImageToBucket(logo, "store-media");
      if (cover) coverUrl = await uploadImageToBucket(cover, "store-media");
      await merchantUpdateStore(store.data.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        wilaya_id: form.wilaya_id,
        commune: form.commune.trim(),
        address_line: form.address_line.trim(),
        latitude: hasCoords ? form.latitude : null,
        longitude: hasCoords ? form.longitude : null,
        opening_hours: { open: form.open, close: form.close, closed_days: closedDays },
        ...(logoUrl ? { logo_url: logoUrl } : {}),
        ...(coverUrl ? { cover_url: coverUrl } : {}),
        instagram_url: form.instagram.trim() || null,
        facebook_url: form.facebook.trim() || null,
        category: form.category,
        subcategories: form.subcategories,
      });
      await qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("تم حفظ إعدادات المتجر ✅");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:opacity-50";
  const labelCls = "mb-1 block text-xs font-bold text-muted-foreground";

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 pb-24 pt-6">
      <PageHeader
        title="تخصيص المتجر"
        subtitle="هوية متجرك تظهر للعملاء في صفحته"
        back="/studio"
      />

      {/* بطاقة الهوية: الغلاف + الشعار + الاسم */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="relative h-40 bg-muted/40">
          {coverPreview ? (
            <img src={coverPreview} alt="غلاف المتجر" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <ImagePlus className="size-6" />
              <span className="text-xs font-bold">غلاف المتجر</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition active:scale-95"
            aria-label="تغيير غلاف المتجر"
          >
            <Camera className="size-3.5" /> تغيير الغلاف
          </button>
        </div>
        <div className="flex items-end gap-3 px-4 pb-4">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="relative -mt-9 size-20 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-primary-soft shadow-soft transition active:scale-95"
            aria-label="تغيير شعار المتجر"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="شعار المتجر" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-3xl font-extrabold text-primary">
                {form.name.trim() ? form.name.trim()[0] : "؟"}
              </span>
            )}
            <span className="absolute bottom-1 left-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Camera className="size-3" />
            </span>
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate text-base font-extrabold text-foreground">
              {form.name.trim() || "اسم متجرك"}
            </p>
            <p className="text-xs text-muted-foreground">اضغط على الشعار أو الغلاف لتغييرهما</p>
          </div>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => pickFile("logo")(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => pickFile("cover")(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </section>

      {/* بطاقة: معلومات المتجر */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-extrabold text-foreground">معلومات المتجر</h2>
        <div>
          <label className={labelCls}>اسم المتجر *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="اسم المتجر"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>الوصف</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="وصف قصير يظهر في صفحة المتجر"
            rows={2}
            className={cn(inputCls, "resize-none")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>رقم الهاتف</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="05XX XX XX XX"
              inputMode="tel"
              dir="ltr"
              className={cn(inputCls, "text-right")}
            />
          </div>
          <div>
            <label className={labelCls}>الواتساب</label>
            <input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="05XX XX XX XX"
              inputMode="tel"
              dir="ltr"
              className={cn(inputCls, "text-right")}
            />
          </div>
        </div>
      </section>

      {/* بطاقة: تصنيف المتجر */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <h2 className="text-sm font-extrabold text-foreground">تصنيف المتجر</h2>
          <p className="text-xs text-muted-foreground">
            تصنيف رئيسي واحد على الأقل، ويمكنك إضافة الفئات الفرعية التي تبيعها.
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
            <label className={labelCls}>الفئات الفرعية (اختيارية)</label>
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
        {!form.category && (
          <p className="rounded-xl bg-warning-soft px-3 py-2 text-[11px] font-bold text-warning-foreground">
            ⚠️ لم يُحدَّد تصنيف المتجر بعد — اختر تصنيفًا رئيسيًا ليظهر متجرك في الأقسام المناسبة.
          </p>
        )}
      </section>

      {/* بطاقة: الموقع */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-extrabold text-foreground">الموقع</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>الولاية *</label>
            <WilayaSelect
              value={form.wilaya_id}
              onChange={(wilaya_id) => setForm({ ...form, wilaya_id })}
              allLabel="اختر الولاية"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>البلدية *</label>
            <input
              value={form.commune}
              onChange={(e) => setForm({ ...form, commune: e.target.value })}
              placeholder="البلدية"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>العنوان *</label>
          <input
            value={form.address_line}
            onChange={(e) => setForm({ ...form, address_line: e.target.value })}
            placeholder="العنوان التفصيلي"
            className={inputCls}
          />
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-soft py-2.5 text-sm font-bold text-primary transition active:scale-[0.98] disabled:opacity-50"
        >
          <MapPin className="size-4" />
          {locating ? "جارٍ تحديد الموقع..." : "تحديد موقعي على الخريطة"}
        </button>
        {form.latitude != null && form.longitude != null && (
          <p className="text-center text-xs font-bold text-success">✓ موقع المتجر محدد</p>
        )}
      </section>

      {/* بطاقة: ساعات العمل */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-extrabold text-foreground">ساعات العمل</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>يبدأ من</label>
            <input
              type="time"
              value={form.open}
              onChange={(e) => setForm({ ...form, open: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>ينتهي عند</label>
            <input
              type="time"
              value={form.close}
              onChange={(e) => setForm({ ...form, close: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>أيام العطلة</label>
          <div className="grid grid-cols-4 gap-1.5">
            {DAYS.map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(i)}
                className={cn(
                  "rounded-lg px-2 py-2 text-xs font-bold transition active:scale-95",
                  closedDays.includes(i)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
                aria-pressed={closedDays.includes(i)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* بطاقة: التواصل الاجتماعي */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-extrabold text-foreground">التواصل الاجتماعي</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>إنستغرام</label>
            <input
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              placeholder="@username"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>فيسبوك</label>
            <input
              value={form.facebook}
              onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              placeholder="صفحتك على فيسبوك"
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* زر الحفظ */}
      <button
        onClick={save}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-bold text-primary-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-50"
      >
        <Save className="size-4.5" />
        {busy ? "جارٍ الحفظ..." : "حفظ التغييرات"}
      </button>
    </div>
  );
}
