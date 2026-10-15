import { useEffect, useState } from "react";

/**
 * الاتصال والشبكة — أدوات مشتركة لمعالجة أخطاء الاتصال (بند 2.5 من الخطة):
 * كشف انقطاع الشبكة، ترجمة الأخطاء التقنية إلى رسائل عربية مفهومة،
 * وتسجيل الأخطاء تقنيًا في السجل المحلي + console.
 */

/** هل انقطع الاتصال؟ يُرجع false على الخادم بشكل آمن. */
export function isOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}

/** سجل تقني محلي لآخر 30 خطأ اتصال — أسهل في التشخيص من نافذة المتصفح */
const NET_LOG_KEY = "sooqy:net-errors";
const NET_LOG_MAX = 30;

type NetLogEntry = { at: string; scope: string; message: string; name?: string };

function readNetLog(): NetLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NET_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NetLogEntry[]) : [];
  } catch {
    return [];
  }
}

function errInfo(err: unknown): { message: string; name?: string; code?: string } {
  if (!err) return { message: "خطأ غير معروف" };
  if (typeof err === "string") return { message: err };
  const e = err as {
    message?: unknown;
    name?: unknown;
    code?: unknown;
    error?: { message?: unknown; code?: unknown };
  };
  const nested = e.error ?? undefined;
  const message =
    (typeof e.message === "string" && e.message) ||
    (nested && typeof nested.message === "string" && nested.message) ||
    "خطأ غير معروف";
  const name = typeof e.name === "string" ? e.name : undefined;
  const code =
    (typeof e.code === "string" && e.code) ||
    (nested && typeof nested.code === "string" && nested.code) ||
    undefined;
  return {
    message,
    ...(name ? { name } : {}),
    ...(code ? { code } : {}),
  };
}

/** تسجيل الخطأ تقنيًا: console + سجل محلي (لا يظهر للمستخدم). */
export function logNetError(scope: string, err: unknown): void {
  const { message, name, code } = errInfo(err);
  const line = `[sooqy:${scope}] ${name ? name + ": " : ""}${message}${code ? ` (${code})` : ""}`;
  if (typeof console !== "undefined") console.error(line, err);

  if (typeof window === "undefined") return;
  try {
    const next: NetLogEntry[] = [
      { at: new Date().toISOString(), scope, message, ...(name ? { name } : {}) },
      ...readNetLog(),
    ].slice(0, NET_LOG_MAX);
    window.localStorage.setItem(NET_LOG_KEY, JSON.stringify(next));
  } catch {
    /* التخزين ممتلئ أو محظور — لا بأس */
  }
}

export function getNetLog(): NetLogEntry[] {
  return readNetLog();
}

export function clearNetLog(): void {
  try {
    window.localStorage.removeItem(NET_LOG_KEY);
  } catch {
    /* تجاهل */
  }
}

export type FriendlyError = { title: string; hint: string; kind: "offline" | "empty" | "server" | "unknown" };

/**
 * ترجمة الخطأ إلى رسالة عربية مفهومة + تصنيفه، للتمييز بين
 * «لا توجد بيانات» و«فشل الاتصال» (بند 2.5).
 */
export function friendlyError(err: unknown): FriendlyError {
  if (isOffline()) {
    return {
      title: "لا يوجد اتصال بالإنترنت",
      hint: "تحقّق من شبكة الهاتف أو Wi-Fi ثم أعد المحاولة.",
      kind: "offline",
    };
  }

  const { message, code, name } = errInfo(err);
  const text = `${message} ${code ?? ""}`.toLowerCase();

  // لا توجد بيانات — ليس خطأ اتصال
  if (code === "PGRST116" || text.includes("no rows") || text.includes("null returned")) {
    return { title: "لا توجد نتائج", hint: "جرّب كلمات أخرى أو أزل عوامل التصفية.", kind: "empty" };
  }

  // فشل في الوصول للشبكة/الخادم
  if (
    name === "TypeError" ||
    text.includes("failed to fetch") ||
    text.includes("networkerror") ||
    text.includes("network request failed") ||
    text.includes("load failed") ||
    text.includes("econnrefused") ||
    text.includes("fetch failed")
  ) {
    return {
      title: "تعذّر الاتصال بالخادم",
      hint: "الشبكة متاحة لكن الوصول للتطبيق فشل. أعد المحاولة بعد قليل.",
      kind: "server",
    };
  }

  // أخطاء المصادقة/الصلاحيات
  if (code === "42501" || text.includes("jwt") || text.includes("token") || text.includes("permission denied")) {
    return {
      title: "انتهت الجلسة أو الصلاحية",
      hint: "سجّل الدخول من جديد ثم أعد المحاولة.",
      kind: "server",
    };
  }

  // أخطاء الخادم العامة (5xx)
  if (/error 5\d\d/.test(text) || text.includes("internal server") || text.includes("bad gateway")) {
    return {
      title: "خطأ في الخادم",
      hint: "الخادم يمر بمشكلة مؤقتة. أعد المحاولة بعد لحظات.",
      kind: "server",
    };
  }

  return {
    title: "حدث خطأ غير متوقع",
    hint: "تعذّر عرض هذه البيانات حاليًا. أعد المحاولة.",
    kind: "unknown",
  };
}

/** متابعة حالة الاتصال لحظيًا (لللافتة العلوية). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(!isOffline());
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}