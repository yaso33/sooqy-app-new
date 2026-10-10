import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Save, Store } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchMyStore, merchantUpdateStore, uploadImageToBucket } from "@/lib/sooqy";
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
        latitude: form.latitude,
        longitude: form.longitude,
        opening_hours: { open: form.open, close: form.close, closed_days: closedDays },
        ...(logoUrl ? { logo_url: logoUrl } : {}),
        ...(coverUrl ? { cover_url: coverUrl } : {}),
        instagram_url: form.instagram.trim() || null,
        facebook_url: form.facebook.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("تم حفظ إعدادات المتجر ✅");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 pb-24 pt-6">
      <PageHeader title="تخصيص المتجر" subtitle="هوية متجرك تظهر للعملاء في صفحته" back="/studio" />

      {/* الغلاف والشعار */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className="relative block h-28 w-full cursor-pointer bg-neutral-100 dark:bg-neutral-800"
        >
          {coverPreview && (
            <img src={coverPreview} alt="غلاف المتجر" className="size-full object-cover" />
          )}
          <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/25 text-xs font-bold text-white">
            <Camera className="size-4" /> غلاف المتجر
          </span>
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => pickFile("cover")(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <div className="flex items-end gap-3 px-4 pb-4">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="relative -mt-8 size-[76px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border-4 border-card bg-neutral-100 shadow-soft dark:bg-neutral-800"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="شعار المتجر" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-2xl font-bold text-primary">
                {form.name.trim() ? form.name.trim()[0] : "؟"}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
              <ImagePlus className="size-5" />
            </span>
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => pickFile("logo")(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div className="min-w-0 flex-1 pb-1">
            <p className="line-clamp-1 font-bold">{form.name.trim() || "اسم متجرك"}</p>
            <p className="text-xs text-muted-foreground">اضغط على الصور لتغييرها</p>
          </div>
        </div>
      </div>

      {/* البيانات الأساسية */}
      <div className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">اسم المتجر *</span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="اسم متجرك"
            className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">وصف المتجر</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="عرّف عملاءك بمتجرك: ماذا تبيع، وما مميزاتك؟"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">الهاتف</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="05XX XX XX XX"
              inputMode="tel"
              dir="ltr"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-right outline-none transition focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">واتساب</span>
            <input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="05XX XX XX XX"
              inputMode="tel"
              dir="ltr"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-right outline-none transition focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">الولاية *</span>
          <WilayaSelect
            value={form.wilaya_id}
            onChange={(wilaya_id) => setForm({ ...form, wilaya_id })}
            allLabel="اختر الولاية"
            className="h-11 w-full"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">البلدية *</span>
            <input
              value={form.commune}
              onChange={(e) => setForm({ ...form, commune: e.target.value })}
              placeholder="البلدية"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">العنوان *</span>
            <input
              value={form.address_line}
              onChange={(e) => setForm({ ...form, address_line: e.target.value })}
              placeholder="الشارع، الحي..."
              className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
      </div>

      {/* موقع المتجر على الخريطة */}
      <div className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <h2 className="font-bold">📍 الموقع على الخريطة</h2>
        <p className="text-xs text-muted-foreground">
          حدّد موقع متجرك ليظهر على الخريطة ويصل إليه العملاء بالاتجاهات.
        </p>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {locating ? "جارٍ تحديد الموقع..." : "تحديد موقعي الحالي"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">خط العرض</span>
            <input
              value={form.latitude ?? ""}
              onChange={(e) =>
                setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="36.75"
              inputMode="decimal"
              dir="ltr"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-left text-xs outline-none transition focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">خط الطول</span>
            <input
              value={form.longitude ?? ""}
              onChange={(e) =>
                setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="3.05"
              inputMode="decimal"
              dir="ltr"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-left text-xs outline-none transition focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
        {form.latitude != null && form.longitude != null && (
          <p className="text-[11px] font-bold text-success">✓ متجرك سيظهر على الخريطة</p>
        )}
      </div>

      {/* روابط التواصل الاجتماعي */}
      <div className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <h2 className="font-bold">روابط التواصل الاجتماعي</h2>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">إنستغرام</span>
          <input
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="instagram.com/متجرك"
            dir="ltr"
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-right outline-none transition focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">فيسبوك</span>
          <input
            value={form.facebook}
            onChange={(e) => setForm({ ...form, facebook: e.target.value })}
            placeholder="facebook.com/متجرك"
            dir="ltr"
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-right outline-none transition focus:ring-2 focus:ring-ring"
          />
        </label>
        <p className="text-[11px] text-muted-foreground">
          تظهر هذه الروابط في صفحة متجرك العامة ليصل العملاء إليك بسهولة.
        </p>
      </div>

      {/* ساعات العمل */}
      <div className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <h2 className="font-bold">ساعات العمل</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">الفتح</span>
            <input
              type="time"
              value={form.open}
              onChange={(e) => setForm({ ...form, open: e.target.value })}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">الإغلاق</span>
            <input
              type="time"
              value={form.close}
              onChange={(e) => setForm({ ...form, close: e.target.value })}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
        <div>
          <span className="mb-1 block text-xs font-bold text-muted-foreground">أيام العطلة</span>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(i)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95",
                  closedDays.includes(i)
                    ? "border-danger bg-danger-soft text-danger"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            في أيام العطلة يظهر متجرك «مغلق» للعملاء.
          </p>
        </div>
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground transition active:scale-[0.99] disabled:opacity-50"
      >
        <Save className="size-4" />
        {busy ? "جارٍ الحفظ..." : "حفظ إعدادات المتجر"}
      </button>
    </div>
  );
}
