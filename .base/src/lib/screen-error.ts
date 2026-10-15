/**
 * صائد أخطاء الشاشة — screen-error.ts
 *
 * طبقة تشخيص تعمل على المتصفح فقط (شامل WebView داخل تطبيق APK) وتعتمد على نفسها
 * بدون أي تبعيات خارجية، لتبقى صالحة حتى لو فشل تحميل CSS أو React أو الوحدات.
 *
 * ما ترصده:
 *  1) أخطاء JS غير المعالجة (window error)
 *  2) فشل تحميل ملفات JS/CSS (شبكة أو مسار خاطئ)
 *  3) رفض الوعود غير المُعالَج (unhandledrejection)
 *  4) الشاشة البيضاء: يفحص بعد 3.5 ثانية هل رُسم أي محتوى
 *  5) آخر خطأ يُحفظ في localStorage ويُعرض عند التشغيل التالي (لو انهار التطبيق)
 *
 * الاستخدام اليدوي من console:  __sooqyReportError(new Error("اختبار"))
 */

type LogEntry = { level: "error" | "warn"; at: number; text: string };
type PersistedError = { title: string; detail: string; url: string; at: number };

interface ShowOptions {
  title: string;
  detail: string;
  hint: string;
  persist: boolean;
}

declare global {
  interface Window {
    __sooqyScreenError?: boolean;
    __sooqyReportError?: (error: unknown, context?: string) => void;
  }
}

const STORAGE_KEY = "sooqy:screen-error";
const OVERLAY_ID = "sooqy-screen-error";
const MAX_LOGS = 40;
const WATCHDOG_DELAY_MS = 3_500;
const PREVIOUS_ERROR_TTL_MS = 24 * 60 * 60 * 1000;

const logs: LogEntry[] = [];
let overlayOpen = false;
let suppressedCount = 0;
let lastCopyText = "";
let watchdogArmed = false;

/* ------------------------------------------------------------------ أدوات */

function describe(value: unknown): string {
  if (value instanceof Error) {
    const cause = (value as { cause?: unknown }).cause;
    const causeText = cause != null ? `\ncaused by: ${describe(cause)}` : "";
    return `${value.name}: ${value.message}\n${value.stack ?? ""}${causeText}`;
  }
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function describeArgs(args: unknown[]): string {
  return args.map(describe).join(" ");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pushLog(level: LogEntry["level"], args: unknown[]) {
  const text = describeArgs(args).slice(0, 600);
  logs.push({ level, at: Date.now(), text });
  if (logs.length > MAX_LOGS) logs.shift();
}

function saveError(payload: PersistedError) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* التخزين ممتلئ أو محظور — نتجاهل */
  }
}

function loadError(): PersistedError | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedError>;
    if (
      typeof parsed.title !== "string" ||
      typeof parsed.detail !== "string" ||
      typeof parsed.url !== "string" ||
      typeof parsed.at !== "number"
    ) {
      return null;
    }
    return { title: parsed.title, detail: parsed.detail, url: parsed.url, at: parsed.at };
  } catch {
    return null;
  }
}

function clearPersistedError() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* تجاهل */
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* تجاهل والانتقال للطريقة البديلة */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------- طبقة العرض */

function whenBody(run: () => void) {
  if (document.body) run();
  else document.addEventListener("DOMContentLoaded", run, { once: true });
}

function buildContextText(): string {
  return [
    `الوقت: ${new Date().toISOString()}`,
    `الرابط: ${location.href}`,
    `العرض: ${innerWidth}×${innerHeight}`,
    `المتصفح: ${navigator.userAgent}`,
    `جاهزية المستند: ${document.readyState}`,
    `سجلات console (${logs.length}):\n${logs
      .slice(-10)
      .map((l) => `  [${l.level}] ${l.text}`)
      .join("\n")}`,
  ].join("\n");
}

function render(options: ShowOptions) {
  const suppressedHtml =
    suppressedCount > 0
      ? `<p style="margin:6px 0 0;font-size:12px;color:#FCD34D;">+ ${suppressedCount} أخطاء أخرى في هذه الجلسة (تفاصيلها في سجل console)</p>`
      : "";
  const hintHtml = options.hint
    ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.7;color:#FCD34D;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:10px;padding:8px 10px;">${escapeHtml(options.hint)}</p>`
    : "";

  const html = `
  <div style="max-width:640px;margin:0 auto;padding:18px 4px 32px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:22px;line-height:1;">⚠️</span>
      <h1 style="margin:0;font-size:16px;font-weight:800;color:#FCA5A5;">${escapeHtml(options.title)}</h1>
    </div>
    <p style="margin:6px 0 0;font-size:12px;color:#94A3B8;" dir="ltr">${escapeHtml(
      new Date().toLocaleString("ar-DZ"),
    )}</p>
    ${suppressedHtml}
    ${hintHtml}
    <pre dir="ltr" style="white-space:pre-wrap;word-break:break-word;background:#0F172A;border:1px solid #1E293B;border-radius:12px;padding:12px;margin:12px 0 0;font-size:12px;line-height:1.6;max-height:38vh;overflow:auto;color:#F8FAFC;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(
      options.detail.slice(0, 8_000),
    )}</pre>
    <details style="margin-top:10px;">
      <summary style="cursor:pointer;font-size:12px;color:#94A3B8;">سياق التشغيل وسجل console</summary>
      <pre dir="ltr" style="white-space:pre-wrap;word-break:break-word;background:#0F172A;border:1px solid #1E293B;border-radius:12px;padding:12px;margin:8px 0 0;font-size:11px;line-height:1.6;max-height:26vh;overflow:auto;color:#CBD5E1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(
        buildContextText().slice(0, 6_000),
      )}</pre>
    </details>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
      <button id="sse-reload" style="flex:1;min-width:130px;background:#6366F1;color:#fff;border:0;border-radius:12px;padding:11px 14px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">إعادة المحاولة</button>
      <button id="sse-copy" style="flex:1;min-width:130px;background:#1E293B;color:#E2E8F0;border:1px solid #334155;border-radius:12px;padding:11px 14px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">نسخ التفاصيل</button>
      <button id="sse-close" style="flex:1;min-width:130px;background:transparent;color:#94A3B8;border:1px solid #334155;border-radius:12px;padding:11px 14px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">إغلاق</button>
    </div>
  </div>`;

  whenBody(() => {
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.setAttribute("dir", "rtl");
      // أرقام z-index عالية عمدًا لتقاوم مكتبات الإشعارات
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:2147483646;background:rgba(2,6,23,.95);color:#E2E8F0;overflow:auto;-webkit-overflow-scrolling:touch;font-family:Tajawal,system-ui,sans-serif;";
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = html;
    overlayOpen = true;

    lastCopyText = `${options.title}\n\n${options.detail}\n\n---\n${buildContextText()}`;

    const reload = overlay.querySelector<HTMLButtonElement>("#sse-reload");
    const copy = overlay.querySelector<HTMLButtonElement>("#sse-copy");
    const close = overlay.querySelector<HTMLButtonElement>("#sse-close");

    reload?.addEventListener("click", () => location.reload());
    copy?.addEventListener("click", () => {
      void copyText(lastCopyText).then((ok) => {
        if (copy) copy.textContent = ok ? "تم النسخ ✓" : "تعذّر النسخ";
      });
    });
    close?.addEventListener("click", () => {
      overlay?.remove();
      overlayOpen = false;
      suppressedCount = 0;
      clearPersistedError();
    });
  });
}

function show(options: ShowOptions) {
  if (overlayOpen) suppressedCount += 1;
  render(options);
  if (options.persist) {
    saveError({ title: options.title, detail: options.detail, url: location.href, at: Date.now() });
  }
}

/* --------------------------------------------------------- رصد الشاشة البيضاء */

function looksBlank(): boolean {
  const body = document.body;
  if (!body) return false;
  const text = (body.innerText ?? body.textContent ?? "").trim();
  if (text.length > 0) return false;
  const meaningful = Array.from(body.children).filter(
    (el) => !/^(SCRIPT|NOSCRIPT|TEMPLATE|STYLE|LINK)$/.test(el.tagName),
  );
  return meaningful.every((el) => !(el.textContent ?? "").trim());
}

function armWatchdog() {
  if (watchdogArmed) return;
  watchdogArmed = true;
  setTimeout(() => {
    if (overlayOpen || !looksBlank()) return;
    show({
      title: "تم رصد شاشة بيضاء",
      detail: [
        "لم يُرسم أي محتوى في الصفحة خلال " + WATCHDOG_DELAY_MS / 1000 + " ثوانٍ.",
        `جاهزية المستند: ${document.readyState}`,
        `عدد عناصر body: ${document.body?.children.length ?? 0}`,
        `الرابط: ${location.href}`,
        "",
        "الأسباب المحتملة: فشل تحميل وحدة JS، خطأ مبكر في تنفيذ التطبيق، أو مسار أصول خاطئ داخل WebView.",
      ].join("\n"),
      hint: "افتح console للمزيد، أو اضغط «نسخ التفاصيل» وأرسلها لمطوّر التطبيق.",
      persist: true,
    });
  }, WATCHDOG_DELAY_MS);
}

/* --------------------------------------------------------------- التثبيت */

function onGlobalError(event: ErrorEvent) {
  const target = event.target as Element | null;
  if (target && target !== (window as unknown as Element) && typeof target.tagName === "string") {
    const tag = target.tagName;
    if (tag === "SCRIPT") {
      const src = (target as HTMLScriptElement).src || "(مسار غير معروف)";
      show({
        title: "فشل تحميل ملف JavaScript",
        detail: `تعذّر تحميل الوحدة:\n${src}\n\nهذا غالبًا سبب الشاشة البيضاء داخل التطبيق.`,
        hint: "تأكد أن الملف موجود في مجلد الأصول (assets) وأن المسار صحيح.",
        persist: true,
      });
      return;
    }
    if (tag === "LINK") {
      const rel = (target as HTMLLinkElement).rel;
      if (rel === "stylesheet" || rel === "modulepreload") {
        show({
          title: rel === "stylesheet" ? "فشل تحميل ملف الأنماط" : "فشل تحميل وحدة مسبقة",
          detail: (target as HTMLLinkElement).href,
          hint: "تحقق من وجود الملف في الأصول ومن المسار المُشار إليه في HTML.",
          persist: true,
        });
        return;
      }
    }
    return; // روابط الأيقونات والـ manifest لا توقف التطبيق
  }

  // خطأ JS غير معالج
  const locationText = event.filename
    ? `\n${event.filename}:${event.lineno}:${event.colno}`
    : "";
  const detail = (event.error != null ? describe(event.error) : event.message) + locationText;
  show({
    title: "خطأ غير معالج في التطبيق",
    detail,
    hint: "",
    persist: true,
  });
}

function onRejection(event: PromiseRejectionEvent) {
  show({
    title: "وعد (Promise) مرفوض بدون معالجة",
    detail: describe(event.reason),
    hint: "",
    persist: true,
  });
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return; // SSR
  if (window.__sooqyScreenError) return; // يمنع التكرار عند hot-reload
  window.__sooqyScreenError = true;

  // التقاط console.error/warn في سجل داخلي يُرفَق مع أي طبقة عرض
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => {
    pushLog("error", args);
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    pushLog("warn", args);
    originalWarn(...args);
  };

  window.addEventListener("error", onGlobalError, true);
  window.addEventListener("unhandledrejection", onRejection);

  window.__sooqyReportError = (error: unknown, context?: string) => {
    reportScreenError(error, context);
  };

  armWatchdog();

  // عرض آخر خطأ محفوظ من التشغيل السابق (لو انهار التطبيق قبل إغلاقه)
  const previous = loadError();
  if (previous) {
    if (Date.now() - previous.at <= PREVIOUS_ERROR_TTL_MS) {
      show({
        title: `${previous.title} (من التشغيل السابق)`,
        detail: previous.detail,
        hint: "هذا الخطأ وقع في الجلسة السابقة قبل إغلاق التطبيق.",
        persist: false,
      });
    } else {
      clearPersistedError();
    }
  }
}

install();

/** تقرير خطأ يدويًا: reportScreenError(new Error("..."), "سياق") */
export function reportScreenError(error: unknown, context?: string) {
  show({
    title: "خطأ مُبلّغ يدويًا",
    detail: (context ? `${context}\n\n` : "") + describe(error),
    hint: "",
    persist: true,
  });
}
