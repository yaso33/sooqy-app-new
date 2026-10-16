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
  Phone,
  Settings,
  Shield,
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
import { WilayaSelect, wilayasQuery } from "@/components/sooqy/WilayaSelect";
import { PageHeader } from "@/components/sooqy/page-header";
import { SectionTitle } from "@/components/sooqy/list-menu";
import { SeoHead } from "@/components/seo/SeoHead";

export const Route = createFileRoute("/profile")({
  head: () => ({}),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile, enabled: !!user });
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: fetchMyOrders, enabled: !!user });
  const myStore = useQuery({ queryKey: ["my-store"], queryFn: fetchMyStore, enabled: !!user });
  const roleQuery = useQuery({
    queryKey: ["my-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .single();
      return data?.role ?? "customer";
    },
    enabled: !!user,
  });
  const isAdmin = roleQuery.data === "admin";
  const wilayas = useQuery(wilayasQuery);
  const favorites = useFavorites();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [commune, setCommune] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
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
      navigate({ to: "/settings" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ.");
    } finally {
      setBusy(false);
    }
  };

  const scrollToForm = () => {
    // scrollIntoView غير متاح في بعض بيئات WebView القديمة — نتجاهله بهدوء
    formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <SeoHead
        title="الملف الشخصي"
        description="عدّل اسمك ورقم هاتفك وولايتك في SooQy."
        keywords="الملف الشخصي, حساب, SooQy"
        ogType="website"
      />
      <div className="mx-auto max-w-xl space-y-5 px-4 pb-24 pt-6">
      <PageHeader
        title="الملف الشخصي"
        subtitle="حسابك وبياناتك في مكان واحد"
        action={
          <div className="inline-flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                aria-label="لوحة الإدارة"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-soft size-10 transition hover:bg-amber-600 active:scale-95"
              >
                <Shield className="size-4.5" />
              </Link>
            )}
            <Link
              to="/studio/settings"
              aria-label="متجري"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft size-10 transition hover:bg-primary/90 active:scale-95"
            >
              <Store className="size-4.5" />
            </Link>
            <Link
              to="/settings"
              aria-label="الإعدادات"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-card border border-border shadow-soft size-10 transition hover:bg-neutral-100 active:scale-95"
            >
              <Settings className="size-4.5" />
            </Link>
          </div>
        }
      />

      {/* رأس الصفحة: الصورة + الاسم + البريد + زر التعديل + شارة الحالة */}
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
          <div className="relative shrink-0">
            <div className="flex size-24 md:size-28 items-center justify-center overflow-hidden rounded-full bg-primary-soft">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="صورتك الشخصية"
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span className="text-4xl md:text-5xl font-extrabold text-primary">
                  {(displayName || initial).trim()[0]}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -left-1 flex size-8 md:size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition active:scale-95"
              aria-label="تغيير الصورة الشخصية"
            >
              <Camera className="size-4 md:size-4.5" />
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
            <p className="truncate text-xl md:text-2xl font-extrabold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-base text-muted-foreground">{user.email}</p>
            <div className="mt-3 flex flex-col gap-1">
              {profile.data?.phone && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{profile.data.phone}</span>
                </div>
              )}
              {(profile.data?.commune || profile.data?.wilaya_id != null) && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {profile.data.commune ?? ""}
                    {profile.data.commune && profile.data.wilaya_id != null ? "، " : ""}
                    {wilayas.data?.find((w) => w.id === profile.data?.wilaya_id)?.name_ar ??
                      (profile.data.wilaya_id != null
                        ? String(profile.data.wilaya_id).padStart(2, "0")
                        : "")}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {profile.data?.is_phone_verified && (
                <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                  <BadgeCheck className="size-3.5" /> هاتف موثّق
                </span>
              )}
              {myStore.data && (
                <span className="flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                  <Store className="size-3.5" /> تاجر
                </span>
              )}
              {isAdmin && (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                  <Shield className="size-3.5" /> مدير
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="mt-4 md:mt-0 flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-4 py-2 text-sm font-bold text-primary transition active:scale-95"
          >
            <Pencil className="size-4" /> {editing ? "إلغاء" : "تعديل"}
          </button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          to="/orders"
          className="rounded-2xl border border-border bg-card p-3 text-center transition active:scale-[0.97]"
        >
          <span className="mx-auto flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Package className="size-4.5" />
          </span>
          <p className="mt-1.5 text-lg font-extrabold text-foreground">
            {orders.data?.length ?? "—"}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground">طلباتي</p>
        </Link>
        <Link
          to="/favorites"
          className="rounded-2xl border border-border bg-card p-3 text-center transition active:scale-[0.97]"
        >
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

      {/* نموذج تعديل الملف (يظهر عند الضغط على تعديل) */}
      {editing && (
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
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  الولاية
                </label>
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
      )}
      </div>
    </>
  );
}
