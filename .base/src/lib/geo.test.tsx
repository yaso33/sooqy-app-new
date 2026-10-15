import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { geoErrorMessage, useGeo } from "./geo";

type Pos = { coords: { latitude: number; longitude: number } };
type Geolike = {
  getCurrentPosition: (
    ok: (p: Pos) => void,
    err?: (e: unknown) => void,
  ) => void;
};

const ALGIERS_POS: Pos = { coords: { latitude: 36.7538, longitude: 3.0588 } };

/** يعرّف geolocation و isSecureContext فقط، دون استبدال كائن window
 *  كاملًا (استبداله يكسر حاوية testing-library). */
function stubGeo(opts: { secure?: boolean; impl?: Geolike | null }) {
  const { secure = true, impl } = opts;
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    writable: true,
    value: impl === null ? undefined : impl,
  });
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    writable: true,
    value: secure,
  });
}

const REAL_GEO = Object.getOwnPropertyDescriptor(navigator, "geolocation");
const REAL_SECURE = Object.getOwnPropertyDescriptor(window, "isSecureContext");

afterEach(() => {
  if (REAL_GEO) Object.defineProperty(navigator, "geolocation", REAL_GEO);
  if (REAL_SECURE) Object.defineProperty(window, "isSecureContext", REAL_SECURE);
  // عَلَم «سبق أن طلبنا الإذن» يُخزَّن محليًا، فنمسحه قبل كل اختبار
  window.localStorage.removeItem("sooqy:geo-asked");
  vi.restoreAllMocks();
});

describe("geoErrorMessage", () => {
  it("تعطي رسالة عربية لكل سبب", () => {
    expect(geoErrorMessage("denied")).toContain("رفض");
    expect(geoErrorMessage("insecure")).toContain("HTTPS");
    expect(geoErrorMessage("unsupported")).toContain("لا يدعم");
    expect(geoErrorMessage("timeout")).toContain("مهلة");
    expect(geoErrorMessage("unavailable")).toContain("تعذّر");
  });

  it("لها رسالة افتراضية حين لا يوجد سبب", () => {
    expect(geoErrorMessage(null)).toBe("تعذّر تحديد موقعك");
  });
});

describe("useGeo.request", () => {
  it("يعيد الموقع بنجاح دون سبب خطأ", async () => {
    const impl: Geolike = {
      getCurrentPosition: (ok) => ok(ALGIERS_POS),
    };
    stubGeo({ impl });
    const { result } = renderHook(() => useGeo());

    await waitFor(() => expect(result.current.pos).not.toBeNull());
    expect(result.current.pos?.lat).toBe(36.7538);
    expect(result.current.reason).toBeNull();
    expect(result.current.denied).toBe(false);
  });

  it("يصنّف رفض الإذن", async () => {
    stubGeo({
      impl: {
        getCurrentPosition: (_ok, err) => err?.({ code: 1, message: "denied" }),
      },
    });
    const { result } = renderHook(() => useGeo());

    await waitFor(() => expect(result.current.reason).toBe("denied"));
    expect(result.current.denied).toBe(true);
    expect(geoErrorMessage(result.current.reason)).toContain("رفض");
  });

  it("لا يرمي استثناءً عند رمي WebView خطأ متزامنًا (السبب الحقيقي للخطأ)", async () => {
    stubGeo({
      impl: {
        getCurrentPosition: () => {
          throw new Error("Illegal invocation");
        },
      },
    });
    const { result } = renderHook(() => useGeo());

    // الأهم: لا يوجد رفض للوعد (كان يظهر كطبقة خطأ فوق الشاشة)
    await waitFor(() => expect(result.current.reason).toBe("unavailable"));
    expect(result.current.locating).toBe(false);
    expect(result.current.pos).toBeNull();
  });

  it("يصنّف السياق غير الآمن دون استدعاء الخدمة", async () => {
    const spy = vi.fn();
    stubGeo({ secure: false, impl: { getCurrentPosition: spy } });
    const { result } = renderHook(() => useGeo());

    await waitFor(() => expect(result.current.reason).toBe("insecure"));
    expect(spy).not.toHaveBeenCalled();
    expect(geoErrorMessage(result.current.reason)).toContain("HTTPS");
  });

  it("يصنّف غياب خدمة الموقع", async () => {
    stubGeo({ impl: null });
    const { result } = renderHook(() => useGeo());

    await waitFor(() => expect(result.current.reason).toBe("unsupported"));
  });

  it("request() اليدوي يعيد السبب مع النتيجة", async () => {
    stubGeo({
      impl: {
        getCurrentPosition: (_ok, err) => err?.({ code: 2, message: "unavailable" }),
      },
    });
    const { result } = renderHook(() => useGeo());
    await waitFor(() => expect(result.current.reason).not.toBeNull());

    let out: Awaited<ReturnType<typeof result.current.request>> | null = null;
    await act(async () => {
      out = await result.current.request();
    });
    expect(out?.pos).toBeNull();
    expect(out?.reason).toBe("unavailable");
  });

  it("لا يكرر طلب الإذن تلقائيًا في صفحة تالية", async () => {
    const spy = vi.fn((_ok: (p: Pos) => void, err?: (e: unknown) => void) =>
      err?.({ code: 1, message: "denied" }),
    );
    stubGeo({ impl: { getCurrentPosition: spy } });
    renderHook(() => useGeo());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(window.localStorage.getItem("sooqy:geo-asked")).toBe("1");
    renderHook(() => useGeo());
    await act(async () => {});
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("ask() يعيد الطلب بعد الرفض فيظهر مرة أخرى", async () => {
    const spy = vi.fn((_ok: (p: Pos) => void, err?: (e: unknown) => void) =>
      err?.({ code: 1, message: "denied" }),
    );
    stubGeo({ impl: { getCurrentPosition: spy } });
    const { result } = renderHook(() => useGeo());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    const requestPerm = vi.fn(async () => ({ state: "granted" as const }));
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      writable: true,
      value: { query: async () => ({ state: "denied" }), request: requestPerm },
    });

    await act(async () => {
      await result.current.ask();
    });
    expect(requestPerm).toHaveBeenCalledWith({ name: "geolocation" });
    expect(spy.mock.calls.length).toBeGreaterThan(1);
  });
});