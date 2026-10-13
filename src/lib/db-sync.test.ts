import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetSupabaseFake } from "@/test/supabase-fake";
import {
  fetchNearStores,
  searchProducts,
  searchStores,
  getStore,
  getProductComparisonOffers,
  fetchMyOrders,
  fetchMyReservations,
  fetchWilayas,
} from "./sooqy";

// محكم (hermetic): استبدال عميل Supabase الحقيقي بالـ fake حتى لا تضرب
// الاختبارات الشبكة الحقيقية (مصدر تعليق/فشل في CI بلا إنترنت).
vi.mock("@/integrations/supabase/client", async () => {
  const { fakeSupabase } = await import("@/test/supabase-fake");
  return { supabase: fakeSupabase };
});

describe("db-sync sanity", () => {
  beforeEach(() => {
    resetSupabaseFake();
  });

  it("fetchWilayas returns rows", async () => {
    const w = await fetchWilayas();
    expect(Array.isArray(w)).toBe(true);
    expect(w.length).toBeGreaterThan(0);
  });
  it("fetchNearStores returns array", async () => {
    const s = await fetchNearStores(null, null, null);
    expect(Array.isArray(s)).toBe(true);
  });
  it("searchProducts returns array", async () => {
    const p = await searchProducts({ query: "", wilaya: null, limit: 5, offset: 0 });
    expect(Array.isArray(p)).toBe(true);
  });
  it("searchStores returns array", async () => {
    const s = await searchStores("", null);
    expect(Array.isArray(s)).toBe(true);
  });
  it("getStore/getProductComparisonOffers tolerate bad id", async () => {
    await expect(getStore("00000000-0000-0000-0000-000000000000")).resolves.toBeNull();
    await expect(getProductComparisonOffers("00000000-0000-0000-0000-000000000000")).resolves.toEqual([]);
  });
  it("fetchMyOrders/fetchMyReservations do not throw without auth", async () => {
    await expect(fetchMyOrders()).resolves.toBeDefined();
    await expect(fetchMyReservations()).resolves.toBeDefined();
  });
});