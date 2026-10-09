import { Keyboard } from "@capacitor/keyboard";
import { Capacitor } from "@capacitor/core";
import { Sentry } from "./sentry";

type LogLevel = "info" | "warn" | "error";

type LogEntry = {
  time: string;
  level: LogLevel;
  event: string;
  details?: Record<string, unknown> | undefined;
};

const STORAGE_KEY = "sooqy_diagnostics_v1";
const MAX_ENTRIES = 200;

function readLogs(): LogEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]",
    );
  } catch {
    return [];
  }
}

function safeDetails(
  details?: Record<string, unknown>,
) {
  if (!details) return undefined;

  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (
      /password|token|authorization|cookie|email|phone|message|text|value/i.test(key)
    ) continue;

    if (
      value === null ||
      ["string", "number", "boolean"].includes(typeof value)
    ) {
      safe[key] =
        typeof value === "string"
          ? value.slice(0, 120)
          : value;
    }
  }

  return safe;
}

export function logEvent(
  level: LogLevel,
  event: string,
  details?: Record<string, unknown>,
) {
  const entry: LogEntry = {
    time: new Date().toISOString(),
    level,
    event,
    details: safeDetails(details),
  };

  const logs = [...readLogs(), entry].slice(-MAX_ENTRIES);

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(logs),
    );
  } catch {}

  const prefix = `[SooQy][${level}] ${event}`;

  if (level === "error") console.error(prefix, entry.details);
  else if (level === "warn") console.warn(prefix, entry.details);
  else console.info(prefix, entry.details);
}

export function getDiagnosticLogs() {
  return readLogs();
}

export function clearDiagnosticLogs() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// أدوات تصحيح من console في WebView (عبر adb / remote debugging):
//   __sooqyLogs()          → طباعة كل السجلات المحفوظة
//   __sooqyLogs(true)      → إرجاع السجلات كمصفوفة (JSON)
//   __sooqyClearLogs()     → مسح السجلات
//   __sooqyDeviceInfo()    → معلومات الجهاز (userAgent، الشاشة...)
declare global {
  interface Window {
    __sooqyLogs?: (asJson?: boolean) => LogEntry[] | void;
    __sooqyClearLogs?: () => void;
    __sooqyDeviceInfo?: () => Record<string, unknown>;
  }
}

// ─── كشف تجمّد خيط JavaScript (نبضة قلب) ────────────────────────
// كل ثانية نخزّن طابعًا زمنيًا في localStorage (آخر 60 ثانية).
// - إذا توقفت النبضة (فجوة > 2 ثانية) → خيط JS كان مشغولًا/متجمدًا
//   (حلقة لا نهائية، إعادة رسم ضخمة، أو ANR) — نُسجّل main.thread.blocked.
// - إذا استمرت النبضة والشاشة مجمّدة → المشكلة في الرسم
//   (WebView/GPU/IME) وليست في JavaScript.
const HB_KEY = "sooqy:hb";
let lastHeartbeat = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function startHeartbeat() {
  if (heartbeatTimer || typeof window === "undefined") return;
  const tick = () => {
    const now = Date.now();
    const gap = lastHeartbeat ? now - lastHeartbeat : 0;
    if (gap > 2000) {
      logEvent("warn", "main.thread.blocked", { gapMs: gap });
    }
    lastHeartbeat = now;
    try {
      const arr: number[] = JSON.parse(localStorage.getItem(HB_KEY) || "[]");
      arr.push(now);
      localStorage.setItem(HB_KEY, JSON.stringify(arr.slice(-60)));
    } catch {}
  };
  tick();
  heartbeatTimer = setInterval(tick, 1000);
}

// المهام الطويلة (>50ms) على الخيط الرئيسي — مصدر التهنيج والتجمّد
function startLongTaskObserver() {
  try {
    if (typeof PerformanceObserver === "undefined") return;
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        logEvent("warn", "longtask", {
          durationMs: Math.round(entry.duration),
          startMs: Math.round(entry.startTime),
        });
      }
    });
    po.observe({ entryTypes: ["longtask"] });
  } catch {}
}

export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height}`,
    dpr: window.devicePixelRatio,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    lang: navigator.language,
    isNative: Capacitor.isNativePlatform(),
  };
}

export function exposeDiagnosticsToConsole() {
  if (typeof window === "undefined") return;
  window.__sooqyLogs = (asJson?: boolean): LogEntry[] | void => {
    const logs = readLogs();
    if (asJson) return logs;
    console.groupCollapsed(`[SooQy] سجلات التشخيص (${logs.length})`);
    for (const entry of logs) {
      const line = `${entry.time} [${entry.level}] ${entry.event}`;
      if (entry.details) console.info(line, entry.details);
      else console.info(line);
    }
    console.groupEnd();
    return undefined;
  };
  window.__sooqyClearLogs = () => {
    clearDiagnosticLogs();
    console.info("[SooQy] تم مسح سجلات التشخيص");
  };
  window.__sooqyDeviceInfo = () => getDeviceInfo();
}

export function initDiagnostics() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    logEvent("error", "javascript.error", {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === "SCRIPT" ||
        target?.tagName === "LINK"
      ) {
        logEvent("error", "resource.load.error", {
          tag: target.tagName,
        });
      }
    },
    true,
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      logEvent("error", "javascript.unhandledrejection", {
        reason:
          event.reason instanceof Error
            ? event.reason.message
            : String(event.reason),
      });

      if (event.reason instanceof Error) {
        Sentry.captureException(event.reason);
      } else {
        Sentry.captureMessage(
          "Unhandled Promise rejection",
          "error",
        );
      }
    },
  );

  window.addEventListener("offline", () => {
    logEvent("warn", "network.offline");
  });

  window.addEventListener("online", () => {
    logEvent("info", "network.online");
  });

  document.addEventListener("focusin", (event) => {
    const target = event.target as HTMLElement | null;

    if (
      target &&
      ["INPUT", "TEXTAREA"].includes(target.tagName)
    ) {
      logEvent("info", "input.focus", {
        tag: target.tagName,
        type: target.getAttribute("type") || "text",
      });
    }
  });

  document.addEventListener("focusout", () => {
    logEvent("info", "input.blur");
  });

  window.addEventListener("resize", () => {
    logEvent("info", "window.resize", {
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
    });
  });

  // تسجيل دورة حياة الصفحة — يكشف إعادة تحميل WebView (انهيار/إعادة إنشاء النشاط)
  window.addEventListener("pagehide", () => {
    logEvent("warn", "lifecycle.pagehide");
  });

  window.addEventListener("pageshow", (event) => {
    logEvent("info", "lifecycle.pageshow", {
      fromCache: event.persisted,
    });
  });

  document.addEventListener("visibilitychange", () => {
    logEvent("info", "lifecycle.visibility", {
      state: document.visibilityState,
    });
  });

  window.addEventListener("focus", () => {
    logEvent("info", "lifecycle.windowFocus");
  });

  window.addEventListener("blur", () => {
    logEvent("info", "lifecycle.windowBlur");
  });

  window.visualViewport?.addEventListener("resize", () => {
    logEvent("info", "visualViewport.resize", {
      height: window.visualViewport?.height,
      width: window.visualViewport?.width,
    });
  });

  logEvent("info", "diagnostics.started", getDeviceInfo());
  exposeDiagnosticsToConsole();
  startHeartbeat();
  startLongTaskObserver();

  // تسجيل الكتابة (مخفف: مرة كل ثانيتين كحد أقصى — لا نؤثر على الأداء)
  let lastInputLog = 0;
  let inputCount = 0;
  document.addEventListener(
    "input",
    () => {
      inputCount += 1;
      const now = Date.now();
      if (now - lastInputLog >= 2000) {
        logEvent("info", "input.change", { countSinceLast: inputCount });
        lastInputLog = now;
        inputCount = 0;
      }
    },
    true,
  );

  // سجّل أحداث لوحة المفاتيح الأصلية عند العمل داخل Capacitor فقط
  // (على الويب لا يوجد تنفيذ أصلي — استدعاؤه يرمي خطأ).
  if (!Capacitor.isNativePlatform()) return;

  void Keyboard.addListener("keyboardWillShow", (info) => {
    logEvent("info", "keyboard.willShow", {
      keyboardHeight: info.keyboardHeight,
    });
  });

  void Keyboard.addListener("keyboardDidShow", (info) => {
    logEvent("info", "keyboard.didShow", {
      keyboardHeight: info.keyboardHeight,
    });
  });

  void Keyboard.addListener("keyboardWillHide", () => {
    logEvent("info", "keyboard.willHide");
  });

  void Keyboard.addListener("keyboardDidHide", () => {
    logEvent("info", "keyboard.didHide");
  });
}