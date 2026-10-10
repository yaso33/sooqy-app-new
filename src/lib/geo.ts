import { useCallback, useEffect, useState } from "react";

export type LatLng = { lat: number; lng: number };

export const ALGIERS: LatLng = { lat: 36.7538, lng: 3.0588 };

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatKm(km: number | null | undefined) {
  if (km == null || !Number.isFinite(km)) return "";
  return km < 1 ? `${Math.round(km * 1000)} م` : `${km.toFixed(1)} كم`;
}

export function directionsUrl(lat?: number | null, lng?: number | null, label?: string) {
  if (lat != null && lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label ?? "")}`;
}

/** سبب تعذّر تحديد الموقع — لعرض رسالة عربية دقيقة بدل «خطأ عام» */
export type GeoReason = "unsupported" | "insecure" | "denied" | "unavailable" | "timeout";

/** نتيجة طلب الموقع — تُرجع السبب معًا حتى لا نعتمد على حالة قديمة بعد await */
export type GeoResult = { pos: LatLng | null; reason: GeoReason | null };

const GEO_MESSAGES: Record<GeoReason, string> = {
  insecure: "تحديد الموقع يحتاج اتصالًا آمنًا (HTTPS) — افتح التطبيق عبر العنوان الآمن",
  unsupported: "متصفحك لا يدعم تحديد الموقع",
  denied: "تم رفض إذن الموقع — فعّله من إعدادات المتصفح ثم أعد المحاولة",
  unavailable: "تعذّر تحديد موقعك — تأكد من تفعيل خدمة الموقع في جهازك",
  timeout: "انتهت مهلة تحديد الموقع — حاول مرة أخرى",
};

export function geoErrorMessage(reason: GeoReason | null): string {
  return reason ? GEO_MESSAGES[reason] : "تعذّر تحديد موقعك";
}

/** حالة إذن الموقع كما يبلّغ عنها المتصفح */
export type GeoPermission = "granted" | "denied" | "prompt" | "unknown";

const ASKED_KEY = "sooqy:geo-asked";

/** هل سبق أن طلبنا الإذن؟ يمنع تكرار النافذة عند كل تنقّل بين الصفحات */
export function geoAskedBefore(): boolean {
  try {
    return window.localStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markGeoAsked(): void {
  try {
    window.localStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* تجاهل */
  }
}

export function geoPermission(): Promise<GeoPermission> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return Promise.resolve("unknown");
  }
  try {
    return navigator.permissions
      .query({ name: "geolocation" })
      .then((s) =>
        s.state === "granted" || s.state === "denied" || s.state === "prompt" ? s.state : "unknown",
      )
      .catch(() => "unknown" as const);
  } catch {
    return Promise.resolve("unknown");
  }
}

/** إعادة طلب الإذن بعد الرفض — تعمل حيث يدعم Permissions.request (Firefox).
 *  Chrome يحتفظ بالرفض، ونكتفي عندها برسالة إرشادية. */
export async function askPermission(): Promise<boolean> {
  // `Permissions.request` غير مُعرَّف في تعريفات TypeScript،
  // وغير موجود أصلًا في Chrome/Safari (يوجد في Firefox و WebView).
  const perms = typeof navigator === "undefined" ? undefined : (navigator.permissions as unknown as {
    request?: (desc: { name: string }) => Promise<{ state: string }>;
  });
  if (!perms?.request) return false;
  try {
    const res = await perms.request({ name: "geolocation" });
    return res.state === "granted";
  } catch {
    return false;
  }
}

/** موقع المتصفح؛ يبقى `pos` فارغًا حتى يسمح المستخدم.
 *  `request()` يمكن استدعاؤه يدويًا لإعادة طلب الإذن بعد الرفض، وهي
 *  لا ترمي استثناءً أبدًا: بعض بيئات WebView ترمي خطأ متزامنًا
 *  (سياق غير آمن) ولو تركناه لانقلب الوعد إلى رفض غير معالج. */
export function useGeo() {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);
  const [locating, setLocating] = useState(false);
  const [reason, setReason] = useState<GeoReason | null>(null);

  const request = useCallback((): Promise<GeoResult> => {
    const bail = (why: GeoReason): GeoResult => {
      setReason(why);
      setDenied(why === "denied");
      setLocating(false);
      return { pos: null, reason: why };
    };

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return Promise.resolve(bail("unsupported"));
    }
    // الصفحات المفتوحة عبر http على شبكة محلية ليست سياقًا آمنًا،
    // فيرفض المتصفح خدمة الموقع قبل أي نداء.
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      return Promise.resolve(bail("insecure"));
    }

    setLocating(true);

    return new Promise<GeoResult>((resolve) => {
      let settled = false;
      const guard = setTimeout(() => finish(null, "timeout"), 9000);

      function finish(next: LatLng | null, why: GeoReason | null) {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        setLocating(false);
        setReason(why);
        if (next) {
          setPos(next);
          setDenied(false);
        } else {
          setDenied(why === "denied");
        }
        resolve({ pos: next, reason: why });
      }

      try {
        navigator.geolocation.getCurrentPosition(
          (p) => finish({ lat: p.coords.latitude, lng: p.coords.longitude }, null),
          (err) => {
            const why: GeoReason =
              err?.code === 1 ? "denied" : err?.code === 3 ? "timeout" : "unavailable";
            finish(null, why);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
        );
      } catch {
        finish(null, "unavailable");
      }
    });
  }, []);

  /**
   * طلب الإذن عند ضغط المستخدم (زر «موقعي» أو «الاتجاهات»).
   * لو كان الرفض سابقًا نحاول Permissions.request أولًا حتى تظهر
   * النافذة مرة أخرى، ثم نقرأ الموقع إن مُنح الإذن.
   */
  const ask = useCallback(async (): Promise<GeoResult> => {
    markGeoAsked();
    const perm = await geoPermission();
    if (perm === "denied") {
      const ok = await askPermission();
      if (!ok) return { pos: null, reason: "denied" };
    }
    return request();
  }, [request]);

  useEffect(() => {
    if (geoAskedBefore()) return;
    markGeoAsked();
    void request();
  }, [request]);

  return { pos, denied, locating, reason, request, ask };
}

export type OpeningHours = { open?: string; close?: string; closed_days?: number[] };

export type StoreStatus = {
  isOpen: boolean;
  label: string;
  description: string;
  nextChange?: string; // e.g., "يفتح بعد 2 ساعة" or "يغلق بعد 30 دقيقة"
};

/** Opening status evaluated in Algeria time (UTC+1). */
export function isOpenNow(h: unknown, now = new Date()): boolean {
  const oh = (h ?? {}) as OpeningHours;
  if (!oh.open || !oh.close) return false;
  const dz = new Date(now.getTime() + (now.getTimezoneOffset() + 60) * 60000);
  if (oh.closed_days?.includes(dz.getDay())) return false;
  const mins = dz.getHours() * 60 + dz.getMinutes();
  const [oH, oM] = oh.open.split(":").map(Number);
  const [cH, cM] = oh.close.split(":").map(Number);
  return mins >= (oH ?? 0) * 60 + (oM ?? 0) && mins < (cH ?? 0) * 60 + (cM ?? 0);
}

/** Get detailed store status with human-readable labels in Arabic. */
export function getStoreStatus(h: unknown, now = new Date()): StoreStatus {
  const oh = (h ?? {}) as OpeningHours;
  const dz = new Date(now.getTime() + (now.getTimezoneOffset() + 60) * 60000);
  const day = dz.getDay();
  const currentMins = dz.getHours() * 60 + dz.getMinutes();

  // No hours data
  if (!oh.open || !oh.close) {
    return {
      isOpen: false,
      label: "ساعات العمل غير متوفرة",
      description: "لم يحدد المتجر ساعات العمل بعد",
    };
  }

  // Check if closed today
  if (oh.closed_days?.includes(day)) {
    // Find next open day
    let nextDay = (day + 1) % 7;
    let daysUntil = 1;
    while (oh.closed_days?.includes(nextDay) && daysUntil < 7) {
      nextDay = (nextDay + 1) % 7;
      daysUntil++;
    }
    const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return {
      isOpen: false,
      label: "مغلق مؤقتًا",
      description: `مغلق اليوم، يفتح ${dayNames[nextDay]}`,
      nextChange: daysUntil === 1 ? "غدًا" : `بعد ${daysUntil} أيام`,
    };
  }

  const [oH, oM] = oh.open.split(":").map(Number);
  const [cH, cM] = oh.close.split(":").map(Number);
  const openMins = (oH ?? 0) * 60 + (oM ?? 0);
  const closeMins = (cH ?? 0) * 60 + (cM ?? 0);

  const isOpen = currentMins >= openMins && currentMins < closeMins;

  if (isOpen) {
    const minsUntilClose = closeMins - currentMins;
    const hours = Math.floor(minsUntilClose / 60);
    const mins = minsUntilClose % 60;
    let nextChange = "";
    if (hours > 0) nextChange = `يغلق بعد ${hours} ساعة${mins > 0 ? ` و${mins} دقيقة` : ""}`;
    else nextChange = `يغلق بعد ${mins} دقيقة`;

    return {
      isOpen: true,
      label: "مفتوح الآن",
      description: `مفتوح حتى ${String(cH).padStart(2, "0")}:${String(cM).padStart(2, "0")}`,
      nextChange,
    };
  } else {
    // Store is closed - check if opens today or tomorrow
    let minsUntilOpen = 0;
    let opensToday = false;

    if (currentMins < openMins) {
      // Opens later today
      minsUntilOpen = openMins - currentMins;
      opensToday = true;
    } else {
      // Opens tomorrow
      minsUntilOpen = (24 * 60 - currentMins) + openMins;
      opensToday = false;
    }

    const hours = Math.floor(minsUntilOpen / 60);
    const mins = minsUntilOpen % 60;
    let nextChange = "";
    if (hours > 0) nextChange = `يفتح بعد ${hours} ساعة${mins > 0 ? ` و${mins} دقيقة` : ""}`;
    else nextChange = `يفتح بعد ${mins} دقيقة`;

    return {
      isOpen: false,
      label: "مغلق الآن",
      description: opensToday
        ? `يفتح اليوم ${String(oH).padStart(2, "0")}:${String(oM).padStart(2, "0")}`
        : `يفتح غدًا ${String(oH).padStart(2, "0")}:${String(oM).padStart(2, "0")}`,
      nextChange,
    };
  }
}

export function greeting(now = new Date()) {
  const h = new Date(now.getTime() + (now.getTimezoneOffset() + 60) * 60000).getHours();
  if (h < 5) return "تصبح على خير 🌙";
  if (h < 12) return "صباح الخير ☀️";
  if (h < 17) return "طاب نهارك 🌤️";
  if (h < 20) return "مساء الخير 🌇";
  return "تصبح على خير 🌙";
}

export const formatDA = (n: number) => `${n.toLocaleString("fr-DZ")} دج`;
