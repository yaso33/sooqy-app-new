import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Heart,
  MapPin,
  Package,
  Pencil,
  Settings,
  Store,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import {
  fetchMyOrders,
  fetchMyProfile,
  fetchMyStore,
  fetchSchemaSupport,
  isValidDzPhone,
  normalizePhone,
  updateMyProfile,
  uploadImageToBucket,
} from "@/lib/sooqy";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { PageHeader } from "@/components/sooqy/page-header";
import { MenuCard, MenuRow, SectionTitle } from "@/components/sooqy/list-menu";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "الملف الشخصي — SooQy" },
      { name: "description", content: "عدّل اسمك ورقم هاتفك ووليتك في SooQy." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile, enabled: !!user });
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: fetchMyOrders, enabled: !!user });
  const myStore = useQuery({ queryKey: ["my-store"], queryFn: fetchMyStore, enabled: !!user });
  const favorites = useFavorites();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [commune, setCommune] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // تعبئة النموذج من بيانات الحساب والملف — مرة واحدة
  useEffect(() => {
    if (loaded || !user) return;
    setFullName((user.user_metadata?.["full_name"] as string | undefined) ?? "");
    if (profile.data) {
      setPhone(profile.data.phone ?? "");
      setWilayaId(profile.data.wilaya_id);
      setCommune(profile.data.commune ?? "");
      setAvatarPreview(profile.data.avatar_url ?? null);
    }
    setLoaded(true);
  }, [user, profile.data, loaded]);

  if (!ready) return null;
  if (!user)
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-3xl bg-primary-soft">
          <User className="size-9 text-primary" strokeWidth={1.6} />
        </span>
        <h1 className="text-h1 text-foreground">سجّل الدخول لتخصيص ملفك</h1>
        <p className="max-w-xs text-body text-muted-foreground">
          اسمك ورقم هاتفك وولايتك — كلها في مكان واحد.
        </p>
        <Link to="/auth" className="btn-primary mt-2">
          دخول
        </Link>
      </div>
    );

  const name = (user.user_metadata?.["full_name"] as string | undefined) ?? "";
  const displayName = name || (user.email ?? "مستخدم SooQy");
  const initial = (user.email ?? "؟").slice(0, 1).toUpperCase();
  const favCount = favorites.products.length + favorites.stores.length;

  const save = async () => {
    const cleanName = fullName.trim();
    if (!cleanName) {
      toast.error("اكتب اسمك الكامل.");
      return;
    }
    const p = normalizePhone(phone.trim());
    if (p && !isValidDzPhone(p)) {
      toast.error("رقم الهاتف غير صالح — يجب أن يبدأ بـ 05 أو 06 أو 07.");
      return;
    }
    setBusy(true);
    try {
      let avatarUrl: string | null | undefined = undefined;
      let avatarSkipped = false;
      if (avatar) {
        avatarUrl = await uploadImageToBucket(avatar, "store-media");
        // القاعدة غير مهاجَرة (عمود avatar_url مفقود) — لا تخزين صامت بلا نتيجة
        const support = await fetchSchemaSupport();
        avatarSkipped = !support.avatar;
      }
      await updateMyProfile({
        full_name: cleanName,
        phone: p,
        wilaya_id: wilayaId,
        commune: commune.trim(),
        ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
      });
      // مزامنة الاسم مع auth metadata ليظهر في حسابي فورًا
      await supabase.auth.updateUser({ data: { full_name: cleanName } });
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      if (avatarSkipped) {
        toast.warning("حُفظت بياناتك، لكن الصورة الشخصية تحتاج تحديث قاعدة البيانات.");
      } else {
        toast.success("تم حفظ الملف الشخصي ✅");
      }
      navigate({ to: "/account" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ.");
    } finally {
      setBusy(false);
    }
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 pb-24 pt-6">
      <PageHeader title="الملف الشخصي" subtitle="حسابك وبياناتك في مكان واحد" back="/account" />

      {/* رأس الصفحة: الصورة + الاسم + البريد + زر التعديل + شارة الحالة */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-primary-soft">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="صورتك الشخصية"
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl font-extrabold text-primary">
                  {(displayName || initial).trim()[0]}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -left-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition active:scale-95"
              aria-label="تغيير الصورة الشخصية"
            >
              <Camera className="size-3.5" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAvatar(f);
                setAvatarPreview(f ? URL.createObjectURL(f) : (profile.data?.avatar_url ?? null));
              }}
              className="hidden"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold text-foreground">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {profile.data?.is_phone_verified && (
                <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                  <BadgeCheck className="size-3" /> هاتف موثّق
                </span>
              )}
              {myStore.data && (
                <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                  <Store className="size-3" /> تاجر
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToForm}
            className="flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary transition active:scale-95"
          >
            <Pencil className="size-3.5" /> تعديل
          </button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-3 gap-2">
        <Link to="/orders" className="rounded-2xl border border-border bg-card p-3 text-center transition active:scale-[0.97]">
          <span className="mx-auto flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Package className="size-4.5" />
          </span>
          <p className="mt-1.5 text-lg font-extrabold text-foreground">
            {orders.data?.length ?? "—"}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground">طلباتي</p>
        </Link>
        <Link to="/favorites" className="rounded-2xl border border-border bg-card p-3 text-center transition active:scale-[0.97]">
          <span className="mx-auto flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Heart className="size-4.5" />
          </span>
          <p className="mt-1.5 text-lg font-extrabold text-foreground">{favCount}</p>
          <p className="text-[10px] font-bold text-muted-foreground">المفضلة</p>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <span className="mx-auto flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Wallet className="size-4.5" />
          </span>
          <p className="mt-1.5 text-lg font-extrabold text-muted-foreground">—</p>
          <p className="text-[10px] font-bold text-muted-foreground">المحفظة · قريبًا</p>
        </div>
      </div>

      {/* قائمة الحساب */}
      <section className="space-y-2">
        <SectionTitle>الحساب</SectionTitle>
        <MenuCard>
          <MenuRow icon={Package} label="طلباتي" hint="متابعة الطلبات وحالاتها" to="/orders" />
          <MenuRow icon={Heart} label="المنتجات المفضلة" hint="العناصر التي حفظتها" to="/favorites" />
          <MenuRow icon={MapPin} label="عناويني" hint="إدارة عناوين التوصيل" soon />
          {myStore.data && (
            <MenuRow icon={Store} label="متجري" hint="إدارة المتجر والمنتجات" to="/studio" />
          )}
          <MenuRow icon={Settings} label="الإعدادات" hint="التحكم في الحساب والتفضيلات" to="/settings" />
        </MenuCard>
      </section>

      {/* نموذج تعديل الملف */}
      <section ref={formRef} className="space-y-2">
        <SectionTitle>تعديل الملف الشخصي</SectionTitle>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">
              الاسم الكامل *
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد بن يوسف"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">
              رقم الهاتف
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XX XX XX"
              inputMode="tel"
              dir="ltr"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-right outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">الولاية</label>
              <WilayaSelect
                value={wilayaId}
                onChange={setWilayaId}
                allLabel="اختر الولاية"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                البلدية
              </label>
              <input
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                placeholder="مثال: باب الزوار"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>
          <button
            onClick={save}
            disabled={busy}
            className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground transition active:scale-[0.97] disabled:opacity-50"
          >
            {busy ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </section>

      {/* ملاحظة */}
      <p className="px-2 text-center text-[10px] text-muted-foreground">
        تُستخدم هذه البيانات لتأكيد الطلبات والتوصيل. يمكنك تعديلها في أي وقت.
      </p>
    </div>
  );
}
