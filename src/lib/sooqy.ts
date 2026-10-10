import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { distanceKm, isOpenNow, type LatLng } from "./geo";

export type Store = Database["public"]["Tables"]["stores"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Offer = Database["public"]["Tables"]["store_offers"]["Row"];
export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
export type Wilaya = Database["public"]["Tables"]["wilayas"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type Review = {
  id: string;
  user_id: string;
  target_type: "product" | "store";
  target_id: string;
  rating: number;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type OfferFull = Offer & { product: Product; store: Store; images: ProductImage[] };
export type ProductGroup = {
  product: Product;
  offers: OfferFull[];
  minPrice: number;
  image: string | null;
  available: boolean;
  totalStock: number;
  nearestKm: number | null;
};

export const CATEGORIES = [
  { id: "shoes", label: "أحذية", emoji: "👟" },
  { id: "phones", label: "هواتف", emoji: "📱" },
  { id: "cosmetics", label: "مستحضرات التجميل", emoji: "💄" },
  { id: "clothes", label: "ملابس", emoji: "👕" },
  { id: "capsules", label: "كبسولات القهوة", emoji: "☕" },
  { id: "other", label: "أخرى", emoji: "🛍️" },
] as const;

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

const OFFER_SELECT =
  "*, product:products!inner(*), store:stores!inner(*), images:product_images(*)";

export function primaryImage(images: ProductImage[] | undefined) {
  if (!images?.length) return null;
  return (images.find((i) => i.is_primary) ?? images[0])!.image_url;
}

export type StockLevel = "in" | "low" | "out";
export function stockLevel(o: Pick<Offer, "is_available" | "stock_quantity">): StockLevel {
  if (!o.is_available || o.stock_quantity <= 0) return "out";
  if (o.stock_quantity <= 3) return "low";
  return "in";
}

export function storeDistance(s: Store, pos: LatLng | null) {
  if (!pos || s.latitude == null || s.longitude == null) return null;
  return distanceKm(pos, { lat: s.latitude, lng: s.longitude });
}

function groupOffers(rows: OfferFull[], pos: LatLng | null): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  for (const o of rows) {
    let g = map.get(o.product_id);
    if (!g) {
      g = {
        product: o.product,
        offers: [],
        minPrice: Infinity,
        image: null,
        available: false,
        totalStock: 0,
        nearestKm: null,
      };
      map.set(o.product_id, g);
    }
    g.offers.push(o);
    const avail = stockLevel(o) !== "out";
    if (avail) {
      g.available = true;
      g.totalStock += o.stock_quantity;
    }
    if (o.price < g.minPrice) g.minPrice = o.price;
    g.image ??= primaryImage(o.images);
    const d = storeDistance(o.store, pos);
    if (d != null && (g.nearestKm == null || d < g.nearestKm)) g.nearestKm = d;
  }
  return [...map.values()];
}

// ---------- Reads ----------

export async function fetchWilayas(): Promise<Wilaya[]> {
  const { data, error } = await supabase.from("wilayas").select("*").order("id");
  if (error) throw error;
  return data;
}

/** Fetch unique communes for a wilaya (from stores table). */
export async function fetchCommunes(wilayaId: number | null): Promise<string[]> {
  if (!wilayaId) return [];
  const { data, error } = await supabase
    .from("stores")
    .select("commune")
    .eq("wilaya_id", wilayaId)
    .not("commune", "is", null);
  if (error) throw error;
  const unique = [...new Set(data.map((s) => s.commune).filter(Boolean))].sort();
  return unique;
}

/** Fetch recent store offers (for homepage promotions). */
export async function fetchHomepageOffers(
  opts: { wilayaId: number | null; limit?: number; offset?: number } = { wilayaId: null },
): Promise<OfferFull[]> {
  const { wilayaId, limit = 8, offset = 0 } = opts;
  let q = supabase.from("store_offers").select(OFFER_SELECT);
  if (wilayaId) q = q.eq("store.wilaya_id", wilayaId);
  const { data, error } = await q
    .eq("is_available", true)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data as unknown as OfferFull[];
}

/** Fetch suggested stores (high rating, verified, etc.) for homepage. */
export async function fetchSuggestedStores(
  opts: {
    wilayaId: number | null;
    lat?: number | null;
    lng?: number | null;
    limit?: number;
    offset?: number;
  } = { wilayaId: null },
): Promise<Store[]> {
  const { wilayaId, lat, lng, limit = 6, offset = 0 } = opts;
  let q = supabase.from("stores").select("*");
  if (wilayaId) q = q.eq("wilaya_id", wilayaId);
  const { data, error } = await q
    .eq("is_verified", true)
    .order("rating", { ascending: false })
    .range(offset, offset + limit * 2 - 1);
  if (error) throw error;
  const pos = lat != null && lng != null ? { lat, lng } : null;
  return data
    .map((s) => ({ ...s, distance: storeDistance(s, pos), open: isOpenNow(s.opening_hours) }))
    .sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9))
    .slice(0, limit);
}

/** Increment product view count (fire-and-forget). */
export async function incrementProductView(productId: string): Promise<void> {
  // RPC موجود في الهجرات (202610120001) — لا مسار احتياطي بـ supabase.raw (غير موجودة في supabase-js v2)
  await supabase.rpc("increment_product_view", { product_id: productId });
}

/** Fetch most viewed products for homepage. */
export async function fetchMostViewedProducts(
  opts: { limit?: number; offset?: number } = {},
): Promise<Product[]> {
  const { limit = 10, offset = 0 } = opts;
  // 1) المسار الأساسي: RPC (يتطلب هجرة 202610120001_product_views.sql —
  //    نفس الهجرة تُنشئ الدالة وعمود view_count معًا، فلا حاجة لمسار وسيط)
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_most_viewed_products", {
    limit_count: limit,
    offset_count: offset,
  });
  if (!rpcError && rpcData) {
    return rpcData as unknown as Product[];
  }
  // 2) الهجرة غير مطبّقة على هذه القاعدة (404) — نعرض أحدث المنتجات
  //    بدلًا من كسر قسم الصفحة الرئيسية؛ يعود الترتيب الصحيح تلقائيًا عند التطبيق.
  const { data: newest, error: nErr } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (nErr) throw nErr;
  return newest as unknown as Product[];
}

/** Most-viewed products as real ProductGroups (with their live offers) for the homepage. */
export async function fetchMostViewedGroups(
  opts: { limit?: number; offset?: number } = {},
): Promise<ProductGroup[]> {
  const products = await fetchMostViewedProducts(opts);
  const ids = products.map((p) => p.id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("store_offers")
    .select(OFFER_SELECT)
    .in("product_id", ids);
  if (error) throw error;
  const groups = groupOffers(data as unknown as OfferFull[], null);
  const byId = new Map(groups.map((g) => [g.product.id, g]));
  // حافظ على ترتيب "الأكثر مشاهدة" من RPC
  const ordered: ProductGroup[] = [];
  for (const id of ids) {
    const g = byId.get(id);
    if (g) ordered.push(g);
  }
  return ordered;
}

export async function fetchNearStores(
  wilayaId: number | null,
  lat?: number | null,
  lng?: number | null,
) {
  let q = supabase.from("stores").select("*");
  if (wilayaId) q = q.eq("wilaya_id", wilayaId);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  const pos = lat != null && lng != null ? { lat, lng } : null;
  return data
    .map((s) => ({ ...s, distance: storeDistance(s, pos), open: isOpenNow(s.opening_hours) }))
    .sort(
      (a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9) || Number(b.rating) - Number(a.rating),
    );
}

export type SortBy = "cheapest" | "nearest" | "rating" | "newest";

export async function searchProducts(opts: {
  query?: string;
  category?: string | null;
  wilaya?: number | null;
  inStockOnly?: boolean;
  sortBy?: SortBy;
  pos?: LatLng | null;
  limit?: number;
  offset?: number;
  minPrice?: number;
  maxPrice?: number;
  radius?: number | null; // km
  commune?: string | null;
}): Promise<ProductGroup[]> {
  let q = supabase.from("store_offers").select(OFFER_SELECT);
  const term = opts.query?.trim().replace(/[%,()]/g, " ");
  if (term) q = q.or(`name.ilike.%${term}%,brand.ilike.%${term}%`, { referencedTable: "products" });
  if (opts.category) q = q.eq("product.category", opts.category);
  if (opts.wilaya) q = q.eq("store.wilaya_id", opts.wilaya);
  if (opts.commune) q = q.ilike("store.commune", opts.commune);
  if (opts.inStockOnly) q = q.eq("is_available", true).gt("stock_quantity", 0);
  if (opts.minPrice != null) q = q.gte("price", opts.minPrice);
  if (opts.maxPrice != null) q = q.lte("price", opts.maxPrice);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 300) - 1);
  if (error) throw error;
  let groups = groupOffers(data as unknown as OfferFull[], opts.pos ?? null);
  // Filter by radius if provided and user position exists
  if (opts.radius != null && opts.pos != null) {
    groups = groups.filter((g) => g.nearestKm != null && g.nearestKm <= opts.radius!);
  }
  const sort = opts.sortBy ?? "newest";
  if (sort === "cheapest") groups.sort((a, b) => a.minPrice - b.minPrice);
  if (sort === "nearest") groups.sort((a, b) => (a.nearestKm ?? 1e9) - (b.nearestKm ?? 1e9));
  if (sort === "rating")
    groups.sort(
      (a, b) =>
        Math.max(...b.offers.map((o) => Number(o.store.rating))) -
        Math.max(...a.offers.map((o) => Number(o.store.rating))),
    );
  return groups;
}

export async function searchStores(
  opts: {
    query?: string;
    wilaya?: number | null;
    commune?: string | null;
    openOnly?: boolean;
    verifiedOnly?: boolean;
    minRating?: number;
    sortBy?: "nearest" | "rating" | "name" | "newest";
    lat?: number | null;
    lng?: number | null;
    limit?: number;
    offset?: number;
  } = {},
): Promise<Store[]> {
  let q = supabase.from("stores").select("*");
  const term = opts.query?.trim().replace(/[%,()]/g, " ");
  if (term) q = q.or(`name.ilike.%${term}%,commune.ilike.%${term}%,description.ilike.%${term}%`);
  if (opts.wilaya) q = q.eq("wilaya_id", opts.wilaya);
  if (opts.commune) q = q.ilike("commune", opts.commune);
  if (opts.verifiedOnly) q = q.eq("is_verified", true);
  if (opts.minRating != null) q = q.gte("rating", opts.minRating);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 50) - 1);
  if (error) throw error;
  let stores = data as Store[];
  const pos = opts.lat != null && opts.lng != null ? { lat: opts.lat, lng: opts.lng } : null;
  stores = stores.map((s) => ({
    ...s,
    distance: storeDistance(s, pos),
    open: isOpenNow(s.opening_hours),
  }));
  // فلتر "مفتوح الآن" يُحسب عميلًا — لا يوجد عمود is_open_now في الجدول
  if (opts.openOnly) stores = stores.filter((s) => s.open);
  const sort = opts.sortBy ?? "nearest";
  if (sort === "nearest") stores.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
  if (sort === "rating") stores.sort((a, b) => Number(b.rating) - Number(a.rating));
  if (sort === "name") stores.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  if (sort === "newest")
    stores.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return stores;
}

export async function getProduct(productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProductComparisonOffers(productId: string): Promise<OfferFull[]> {
  const { data, error } = await supabase
    .from("store_offers")
    .select(OFFER_SELECT)
    .eq("product_id", productId)
    .order("price");
  if (error) throw error;
  return data as unknown as OfferFull[];
}

export async function getStore(storeId: string) {
  const { data, error } = await supabase.from("stores").select("*").eq("id", storeId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getStoreOffers(storeId: string): Promise<OfferFull[]> {
  const { data, error } = await supabase
    .from("store_offers")
    .select(OFFER_SELECT)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as OfferFull[];
}

export async function fetchReviews(
  targetType: "product" | "store",
  targetId: string,
): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Review[];
}

export async function fetchMyReview(targetType: "product" | "store", targetId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Review | null;
}

export async function submitReview(
  targetType: "product" | "store",
  targetId: string,
  rating: number,
  comment?: string,
) {
  // المراجعات الموثّقة: عبر دالة RPC تتحقق من طلب مُسلَّم أو حجز مُستلَم
  // (هجرة 202610140001). إن كانت القاعدة غير مهاجَرة (الدالة غير موجودة)
  // نرجع للإدراج المباشر القديم حتى لا تنكسر الميزة.
  const { data, error } = await supabase.rpc("submit_review", {
    _target_type: targetType,
    _target_id: targetId,
    _rating: rating,
    _comment: comment?.trim() || null,
  });
  if (!error) return data as unknown as Review;
  const msg = String(error.message ?? "");
  if (msg.includes("PGRST202") || msg.includes("Could not find the function")) {
    const { data: direct, error: dErr } = await supabase
      .from("reviews")
      .insert({
        target_type: targetType,
        target_id: targetId,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single();
    if (dErr) throw new Error(friendlyError(dErr));
    return direct as unknown as Review;
  }
  throw new Error(friendlyError(error));
}

export async function getOffersByIds(ids: string[]): Promise<OfferFull[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("store_offers").select(OFFER_SELECT).in("id", ids);
  if (error) throw error;
  return data as unknown as OfferFull[];
}

// ---------- Customer actions ----------

const ERRORS: Record<string, string> = {
  not_authenticated: "يجب تسجيل الدخول أولاً",
  out_of_stock: "المنتج غير متوفر أو الكمية غير كافية",
  offer_not_found: "العرض غير موجود",
  invalid_quantity: "كمية غير صالحة",
  receipt_required: "يرجى رفع صورة وصل الدفع عبر بريدي موب",
  empty_bag: "السلة فارغة",
  invalid_wilaya: "اختر ولاية صحيحة",
  reservation_not_found: "كود الحجز غير موجود في متجرك",
  reservation_expired: "انتهت صلاحية الحجز",
  reservation_collected: "تم استلام هذا الحجز سابقاً",
  reservation_cancelled: "هذا الحجز ملغى",
  not_cancellable: "لا يمكن إلغاء هذا الحجز",
  forbidden: "غير مسموح",
  review_not_verified: "لا يمكنك التقييم إلا بعد استلام طلب أو حجز مؤكد",
  invalid_rating: "التقييم يجب أن يكون بين 1 و 5 نجوم",
};
export function friendlyError(e: unknown) {
  const msg = (e as { message?: string })?.message ?? String(e);
  const key = Object.keys(ERRORS).find((k) => msg.includes(k));
  return key ? ERRORS[key]! : msg;
}

export async function createReservation(
  offerId: string,
  _storeId: string,
  hoursLimit = 3,
  quantity = 1,
  options: Record<string, string> = {},
) {
  const { data, error } = await supabase.rpc("create_reservation", {
    _offer_id: offerId,
    _quantity: quantity,
    _hours: hoursLimit,
    _options: options,
  });
  if (error) throw new Error(friendlyError(error));
  return data as Reservation;
}

export async function cancelReservation(id: string) {
  const { error } = await supabase.rpc("cancel_reservation", { _reservation_id: id });
  if (error) throw new Error(friendlyError(error));
}

export async function fetchMyReservations() {
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "*, store:stores(name, phone, latitude, longitude, address_line), offer:store_offers(price, product:products(name))",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function fetchMyOrders() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*), wilaya:wilayas(name_ar)")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMyNotifications() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function markNotificationsRead() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", u.user.id)
    .eq("read", false);
  if (error) throw error;
}

/** Upload to a private bucket under the user's folder, returning a long-lived signed URL. */
export async function uploadImageToBucket(
  file: File,
  bucketName: "store-media" | "product-media" | "receipts",
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error(ERRORS["not_authenticated"]);
  if (file.size > 10 * 1024 * 1024) throw new Error("الصورة أكبر من 10MB");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const ttl = bucketName === "receipts" ? 60 * 60 * 24 * 365 : 60 * 60 * 24 * 365 * 10;
  const { data: signed, error: sErr } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, ttl);
  if (sErr) throw sErr;
  return signed.signedUrl;
}

// ---------- Schema support (تخصيص إضافي) ----------
// أعمدة جديدة (روابط التواصل، صورة الملف الشخصي) تحتاج هجرة
// supabase/migrations/202610130001_store_socials_avatar.sql.
// نفحص وجودها مرة واحدة لكل جلسة ونتكيف تلقائيًا مع القواعد غير المهاجَرة.

let schemaSupport: Promise<{ storeSocials: boolean; avatar: boolean }> | null = null;

export function fetchSchemaSupport() {
  if (!schemaSupport) {
    schemaSupport = (async () => {
      const [insta, fb, av] = await Promise.all([
        supabase.from("stores").select("instagram_url").limit(1),
        supabase.from("stores").select("facebook_url").limit(1),
        supabase.from("profiles").select("avatar_url").limit(1),
      ]);
      return { storeSocials: !insta.error && !fb.error, avatar: !av.error };
    })().catch(() => ({ storeSocials: false, avatar: false }));
  }
  return schemaSupport;
}

export type BagItem = { offerId: string; quantity: number; options: Record<string, string> };

export async function createOrderWithDelivery(
  bagItems: BagItem[],
  deliveryType: "home" | "desk",
  wilayaId: number,
  commune: string,
  paymentMethod: "cod" | "baridimob",
  receiptFile: File | null,
  contact: { fullName: string; phone: string; address: string },
) {
  let receiptUrl: string | null = null;
  if (paymentMethod === "baridimob") {
    if (!receiptFile) throw new Error(ERRORS["receipt_required"]);
    receiptUrl = await uploadImageToBucket(receiptFile, "receipts");
  }
  const { data, error } = await supabase.rpc("create_order", {
    _items: bagItems.map((b) => ({
      offer_id: b.offerId,
      quantity: b.quantity,
      options: b.options,
    })),
    _delivery_type: deliveryType,
    _wilaya_id: wilayaId,
    _commune: commune,
    _address_line: contact.address,
    _full_name: contact.fullName,
    _phone: contact.phone,
    _payment_method: paymentMethod,
    ...(receiptUrl ? { _receipt_url: receiptUrl } : {}),
  });
  if (error) throw new Error(friendlyError(error));
  return data as string;
}

// ---------- Merchant ----------

export async function fetchMyStore() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMyRoles() {
  const { data, error } = await supabase.from("user_roles").select("role");
  if (error) throw error;
  return data.map((r) => r.role);
}

export async function becomeMerchant() {
  const { error } = await supabase.rpc("become_merchant");
  if (error) throw new Error(friendlyError(error));
}

export async function merchantCreateStore(input: {
  name: string;
  phone: string;
  whatsapp: string;
  wilaya_id: number;
  commune: string;
  address_line: string;
  latitude: number | null;
  longitude: number | null;
  open: string;
  close: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error(ERRORS["not_authenticated"]);
  const slug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6);
  const { data, error } = await supabase
    .from("stores")
    .insert({
      owner_id: u.user.id,
      name: input.name,
      slug,
      phone: input.phone,
      whatsapp: input.whatsapp,
      wilaya_id: input.wilaya_id,
      commune: input.commune,
      address_line: input.address_line,
      latitude: input.latitude,
      longitude: input.longitude,
      opening_hours: { open: input.open, close: input.close, closed_days: [] },
      is_verified: true, // التوثيق التلقائي — المتجر يظهر موثقًا فورًا
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function merchantToggleAvailability(offerId: string, isAvailable: boolean) {
  const { error } = await supabase
    .from("store_offers")
    .update({ is_available: isAvailable, last_confirmed_at: new Date().toISOString() })
    .eq("id", offerId);
  if (error) throw error;
}

export async function merchantUpdateOffer(
  offerId: string,
  patch: { price?: number; stock_quantity?: number },
) {
  const { error } = await supabase
    .from("store_offers")
    .update({
      ...patch,
      last_confirmed_at: new Date().toISOString(),
      ...(patch.stock_quantity != null ? { is_available: patch.stock_quantity > 0 } : {}),
    })
    .eq("id", offerId);
  if (error) throw error;
}

export async function merchantConfirmAll(storeId: string) {
  const { data, error } = await supabase.rpc("merchant_confirm_all_stock", { _store_id: storeId });
  if (error) throw new Error(friendlyError(error));
  return data as number;
}

export async function merchantConfirmReservation(code: string) {
  const { data, error } = await supabase.rpc("merchant_confirm_reservation", { _code: code });
  if (error) throw new Error(friendlyError(error));
  return data as Reservation;
}

export async function merchantQuickAddProduct(
  productData: {
    storeId: string;
    name: string;
    price: number;
    stock: number;
    category: string;
    brand?: string;
    description?: string;
    sizes?: string[];
    colors?: string[];
  },
  imageFile: File | null,
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error(ERRORS["not_authenticated"]);
  const imageUrl = imageFile ? await uploadImageToBucket(imageFile, "product-media") : null;
  const { data: product, error: pErr } = await supabase
    .from("products")
    .insert({
      name: productData.name,
      category: productData.category,
      brand: productData.brand || null,
      description: productData.description || null,
      created_by: u.user.id,
    })
    .select()
    .single();
  if (pErr) throw pErr;
  const options: Record<string, string[]> = {};
  if (productData.sizes?.length) options["sizes"] = productData.sizes;
  if (productData.colors?.length) options["colors"] = productData.colors;
  const { data: offer, error: oErr } = await supabase
    .from("store_offers")
    .insert({
      store_id: productData.storeId,
      product_id: product.id,
      price: productData.price,
      stock_quantity: productData.stock,
      is_available: productData.stock > 0,
      options,
    })
    .select()
    .single();
  if (oErr) throw oErr;
  if (imageUrl) {
    const { error: iErr } = await supabase
      .from("product_images")
      .insert({ offer_id: offer.id, image_url: imageUrl, is_primary: true });
    if (iErr) throw iErr;
  }
  return offer;
}

/** تعديل بيانات المنتج نفسه (الاسم/الوصف/العلامة/التصنيف) — يظهر في كل المتاجر التي تبيعه. */
export async function merchantUpdateProduct(
  productId: string,
  patch: { name?: string; description?: string | null; brand?: string | null; category?: string },
) {
  const { error } = await supabase.from("products").update(patch).eq("id", productId);
  if (error) throw error;
}

/** استبدال صورة المنتج (أو إضافتها إن لم توجد) لعرض معيّن. */
export async function merchantReplaceOfferImage(offerId: string, file: File) {
  const imageUrl = await uploadImageToBucket(file, "product-media");
  const { data: existing, error: qErr } = await supabase
    .from("product_images")
    .select("id")
    .eq("offer_id", offerId)
    .eq("is_primary", true)
    .maybeSingle();
  if (qErr) throw qErr;
  if (existing) {
    const { error } = await supabase
      .from("product_images")
      .update({ image_url: imageUrl })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("product_images")
      .insert({ offer_id: offerId, image_url: imageUrl, is_primary: true });
    if (error) throw error;
  }
  return imageUrl;
}

export async function fetchStoreReservations(storeId: string) {
  const { data, error } = await supabase
    .from("reservations")
    .select("*, offer:store_offers(price, product:products(name))")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function fetchStoreOrderItems(storeId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "*, order:orders(id, full_name, phone, commune, delivery_type, payment_method, receipt_url, status, created_at, wilaya:wilayas(name_ar))",
    )
    .eq("store_id", storeId)
    .order("id", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function merchantUpdateOrderStatus(
  orderId: string,
  status: "confirmed" | "shipped" | "delivered" | "cancelled",
) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}

// ---------- Detail pages ----------

export const DZ_PHONE = /^0[567]\d{8}$/;
export function normalizePhone(v: string) {
  return v.replace(/[\s.-]/g, "").replace(/^\+213/, "0");
}
export function isValidDzPhone(v: string) {
  return DZ_PHONE.test(normalizePhone(v));
}

export async function fetchOrder(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, items:order_items(*, store:stores(id, name, phone, whatsapp)), wilaya:wilayas(name_ar)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchReservation(id: string) {
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "*, store:stores(id, name, phone, whatsapp, latitude, longitude, address_line, commune), offer:store_offers(price, product:products(id, name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function fetchMyProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(patch: {
  full_name: string;
  phone: string;
  wilaya_id: number | null;
  commune: string;
  avatar_url?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error(ERRORS["not_authenticated"]);
  const data: Record<string, unknown> = {
    full_name: patch.full_name,
    phone: patch.phone,
    wilaya_id: patch.wilaya_id,
    commune: patch.commune,
  };
  // صورة الملف: تُحفظ فقط إذا كان العمود موجودًا في القاعدة (هجرة 202610130001)
  if (patch.avatar_url !== undefined) {
    const support = await fetchSchemaSupport();
    if (support.avatar) data.avatar_url = patch.avatar_url;
  }
  const existing = await fetchMyProfile();
  if (existing) {
    const { error } = await supabase.from("profiles").update(data).eq("user_id", u.user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("profiles").insert({ ...data, user_id: u.user.id });
    if (error) throw error;
  }
}

export async function merchantUpdateStore(
  storeId: string,
  patch: {
    name: string;
    description: string | null;
    phone: string;
    whatsapp: string;
    wilaya_id: number;
    commune: string;
    address_line: string;
    latitude: number | null;
    longitude: number | null;
    opening_hours: { open: string; close: string; closed_days: number[] };
    logo_url?: string;
    cover_url?: string;
    instagram_url?: string | null;
    facebook_url?: string | null;
  },
) {
  const data: Record<string, unknown> = { ...patch };
  // روابط التواصل: تُحفظ فقط إذا كانت الأعمدة موجودة (هجرة 202610130001)
  if (patch.instagram_url !== undefined || patch.facebook_url !== undefined) {
    const support = await fetchSchemaSupport();
    if (!support.storeSocials) {
      delete data.instagram_url;
      delete data.facebook_url;
    }
  }
  const { error } = await supabase.from("stores").update(data).eq("id", storeId);
  if (error) throw error;
}

export async function adminFetchStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("*, wilaya:wilayas(name_ar)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminSetVerified(storeId: string, verified: boolean) {
  const { error } = await supabase
    .from("stores")
    .update({ is_verified: verified })
    .eq("id", storeId);
  if (error) throw error;
}
