import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { clearNetLog, friendlyError, getNetLog, isOffline, logNetError } from "./conn";

describe("isOffline", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("يعيد false على الخادم (لا navigator)", () => {
    vi.stubGlobal("navigator", undefined);
    expect(isOffline()).toBe(false);
  });

  it("يكتشف انقطاع الشبكة", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isOffline()).toBe(true);
  });

  it("يعيد false عند الاتصال", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(isOffline()).toBe(false);
  });
});

describe("friendlyError", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("يميّز بين انقطاع الشبكة وفشل الخادم", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(friendlyError(new Error("boom")).kind).toBe("offline");

    vi.stubGlobal("navigator", { onLine: true });
    expect(friendlyError(new TypeError("Failed to fetch")).kind).toBe("server");
  });

  it("يصنّف غياب النتائج كـ«لا توجد بيانات» لا كخطأ اتصال", () => {
    const res = friendlyError({ message: "No rows returned", code: "PGRST116" });
    expect(res.kind).toBe("empty");
    expect(res.title).toBe("لا توجد نتائج");
  });

  it("يتعامل مع نص عادي", () => {
    expect(friendlyError("").title).toBe("حدث خطأ غير متوقع");
  });

  it("يتعامل مع أخطاء الخادم 500", () => {
    expect(friendlyError(new Error("Internal Server Error")).kind).toBe("server");
  });

  it("يقرأ الرسالة من كائن supabase المتداخل", () => {
    const res = friendlyError({ error: { message: "JWT expired", code: "PGRST301" } });
    expect(res.kind).toBe("server");
  });
});

describe("logNetError", () => {
  beforeEach(() => {
    clearNetLog();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("يسجّل الخطأ في السجل المحلي عبر localStorage", () => {
    const mem = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => void mem.set(k, v),
        removeItem: (k: string) => void mem.delete(k),
      },
    });

    logNetError("test", new Error("boom"));
    logNetError("test2", { error: { message: "JWT expired", code: "PGRST301" } });

    const log = getNetLog();
    expect(log).toHaveLength(2);
    const [first, second] = log;
    expect(first?.scope).toBe("test2");
    expect(second?.scope).toBe("test");
    expect(second?.message).toBe("boom");

    clearNetLog();
    expect(getNetLog()).toHaveLength(0);
  });
});