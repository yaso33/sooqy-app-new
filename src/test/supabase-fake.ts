import { vi } from "vitest";

/**
 * Fake قابل للبرمجة لعميل Supabase — يحاكي سلوك supabase-js v2
 * (منشئ استعلامات thenable + rpc + auth + storage + realtime)
 * مع بيانات تجريبية ثابتة، ليُستخدم في اختبارات "رحلة المستخدم".
 */

export type FakeUser = { id: string; email: string };

export const store1 = {
  id: "store-1",
  owner_id: "user-1",
  slug: "store-1",
  name: "متجر التجربة",
  description: "متجر تجريبي لاختبارات الواجهة",
  phone: "0550000000",
  whatsapp: "0550000000",
  wilaya_id: 16,
  commune: "الجزائر الوسطى",
  address_line: "شارع ديدوش مراد",
  latitude: 36.7753,
  longitude: 3.0587,
  opening_hours: { open: "09:00", close: "18:00", closed_days: [] as number[] },
  is_verified: true,
  logo_url: null,
  cover_url: null,
  rating: 4.5,
  instagram_url: null,
  facebook_url: null,
  commission_rate: 7,
  created_at: "2026-01-01T10:00:00Z",
};

export const product1 = {
  id: "prod-1",
  name: "حذاء رياضي",
  brand: "نايك",
  category: "shoes",
  description: "حذاء مريح للاستعمال اليومي",
  created_at: "2026-01-01T10:00:00Z",
  view_count: 0,
};

export const offer1 = {
  id: "offer-1",
  product_id: "prod-1",
  store_id: "store-1",
  price: 2500,
  stock_quantity: 10,
  is_available: true,
  created_at: "2026-01-01T10:00:00Z",
  product: product1,
  store: store1,
  images: [
    {
      id: "img-1",
      offer_id: "offer-1",
      image_url: "https://cdn.test/img1.jpg",
      is_primary: true,
      created_at: "2026-01-01T10:00:00Z",
    },
  ],
};

export const wilayaFixtures = [
  { id: 16, name_ar: "الجزائر" },
  { id: 31, name_ar: "وهران" },
];

export const state = {
  sessionUser: null as FakeUser | null,
  stores: [] as Record<string, unknown>[],
  offers: [] as Record<string, unknown>[],
  products: [] as Record<string, unknown>[],
  images: [] as Record<string, unknown>[],
  wilayas: [] as Record<string, unknown>[],
  reviews: [] as Record<string, unknown>[],
  calls: [] as string[],
  authCb: null as ((event: string, session: unknown) => void) | null,
};

export function resetSupabaseFake() {
  state.sessionUser = null;
  state.stores = [store1];
  state.offers = [offer1];
  state.products = [product1];
  state.images = [];
  state.wilayas = [...wilayaFixtures];
  state.reviews = [];
  state.calls = [];
  state.authCb = null;
}

export function setSession(user: FakeUser | null) {
  state.sessionUser = user;
}

const RPC_MISSING = {
  message: "Could not find the function in the schema cache",
  code: "PGRST202",
};

function ok(data: unknown = null) {
  return { data, error: null };
}

function tableData(table: string): Record<string, unknown>[] {
  switch (table) {
    case "stores":
      return state.stores;
    case "store_offers":
      return state.offers;
    case "products":
      return state.products;
    case "product_images":
      return state.images;
    case "wilayas":
      return state.wilayas;
    case "reviews":
      return state.reviews;
    default:
      return [];
  }
}

function getPath(row: Record<string, unknown>, col: string): unknown {
  return col.split(".").reduce<unknown>((o, k) => {
    if (o && typeof o === "object") return (o as Record<string, unknown>)[k];
    return undefined;
  }, row);
}

function makeBuilder(table: string) {
  const filters: Array<(row: Record<string, unknown>) => boolean> = [];
  let inserted: Record<string, unknown> | null = null;
  const b: Record<string, unknown> = {};

  const record = (name: string, args: unknown[]) => {
    state.calls.push(
      `${table}.${name}(${args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(", ")})`,
    );
  };

  for (const m of [
    "select",
    "order",
    "limit",
    "range",
    "offset",
    "not",
    "or",
    "in",
    "ilike",
    "gt",
    "gte",
    "lt",
    "lte",
    "contains",
    "match",
    "returns",
    "abortSignal",
  ]) {
    b[m] = (...args: unknown[]) => {
      record(m, args);
      return b;
    };
  }

  b.eq = (col: string, val: unknown) => {
    record("eq", [col, val]);
    filters.push((row) => getPath(row, col) === val);
    return b;
  };
  b.neq = (col: string, val: unknown) => {
    record("neq", [col, val]);
    filters.push((row) => getPath(row, col) !== val);
    return b;
  };

  const resolve = () => {
    if (inserted) return [inserted];
    return tableData(table).filter((r) => filters.every((f) => f(r)));
  };

  b.insert = (payload: unknown) => {
    record("insert", [payload]);
    const row = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
    inserted = {
      ...row,
      id: row.id ?? `${table}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: "2026-01-01T10:00:00Z",
    };
    if (table === "stores") state.stores.unshift(inserted);
    if (table === "products") state.products.unshift(inserted);
    if (table === "store_offers") state.offers.unshift(inserted);
    if (table === "product_images") state.images.unshift(inserted);
    return b;
  };
  b.upsert = b.insert;
  b.update = (payload: unknown) => {
    record("update", [payload]);
    const patch = (payload ?? {}) as Record<string, unknown>;
    for (const r of resolve()) Object.assign(r, patch);
    return b;
  };
  b.delete = () => {
    record("delete", []);
    return b;
  };

  b.maybeSingle = () => Promise.resolve(ok(resolve()[0] ?? null));
  b.single = b.maybeSingle;

  const thenable = {
    then: (onOk?: (r: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
      Promise.resolve(ok(resolve())).then(onOk, onErr),
    catch: (onErr: (e: unknown) => unknown) => Promise.resolve(ok(resolve())).catch(onErr),
    finally: (cb: () => void) => Promise.resolve(ok(resolve())).finally(cb),
  };
  return Object.assign(b, thenable);
}

async function rpc(name: string, _params?: Record<string, unknown>) {
  state.calls.push(`rpc.${name}`);
  switch (name) {
    case "become_merchant":
    case "increment_product_view":
    case "cancel_reservation":
    case "merchant_confirm_reservation":
      return ok();
    case "get_most_viewed_products":
      // القاعدة الحية تفتقدها — نختبر مسار السقوط الاحتياطي (أحدث المنتجات)
      return { data: null, error: RPC_MISSING };
    case "create_order":
      // القاعدة الحقيقية تُرجع نصّ معرّف الطلب
      return ok("order-1");
    case "create_reservation":
      return ok({ id: "res-1", code: "ABC123" });
    case "merchant_confirm_all_stock":
      return ok({ updated: 2 });
    case "submit_review": {
      const params = (_params ?? {}) as Record<string, unknown>;
      const review = {
        id: `review-${state.reviews.length + 1}`,
        user_id: state.sessionUser?.id ?? "user-1",
        target_type: params._target_type,
        target_id: params._target_id,
        rating: params._rating,
        comment: params._comment ?? null,
        status: "approved",
        created_at: "2026-01-01T10:00:00Z",
      };
      state.reviews.unshift(review);
      return ok(review);
    }
    default:
      return { data: null, error: RPC_MISSING };
  }
}

const auth = {
  getSession: async () =>
    ok(state.sessionUser ? { session: { user: state.sessionUser } } : { session: null }),
  getUser: async () => ok({ user: state.sessionUser }),
  onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
    state.authCb = cb;
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  signInWithPassword: async (p: { email: string }) => {
    state.calls.push(`auth.signInWithPassword(${p.email})`);
    return ok({
      user: { id: "user-1", email: p.email },
      session: { user: { id: "user-1", email: p.email } },
    });
  },
  signInWithOtp: async (p: { email: string }) => {
    state.calls.push(`auth.signInWithOtp(${p.email})`);
    return ok({});
  },
  signUp: async (p: { email: string; password: string }) => {
    state.calls.push(`auth.signUp(${p.email})`);
    return ok({ user: { id: "user-2", email: p.email }, session: null });
  },
  signOut: async () => {
    state.sessionUser = null;
    return ok();
  },
  updateUser: async (attrs: Record<string, unknown>) => {
    state.calls.push(`auth.updateUser(${JSON.stringify(attrs)})`);
    return ok({ user: { ...state.sessionUser, ...attrs } });
  },
};

const storageFrom = (bucket: string) => ({
  upload: async (path: string) => {
    state.calls.push(`storage.${bucket}.upload(${path})`);
    return ok({ path });
  },
  createSignedUrl: async (path: string, _expiresIn: number) => {
    state.calls.push(`storage.${bucket}.signed(${path})`);
    return ok({ signedUrl: `https://cdn.test/${bucket}/${path}` });
  },
  getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${bucket}/${path}` } }),
  remove: async (paths: string[]) => {
    state.calls.push(`storage.${bucket}.remove`);
    return ok({ path: paths });
  },
});

const channel = (name: string) => ({
  on: () => channel(name),
  subscribe: async () => ({ unsubscribe: () => {} }),
  unsubscribe: () => {},
});

export const fakeSupabase = {
  from: (t: string) => makeBuilder(t),
  rpc,
  auth,
  storage: { from: storageFrom },
  channel,
  realtime: { channel },
};

export const _vi = vi; // يضمن بقاء استيراد vitest مستخدمًا (لا حاجة فعلية لكن للتوثيق)
