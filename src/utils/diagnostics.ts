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
declare global {
  interface Window {
    __sooqyLogs?: (asJson?: boolean) => LogEntry[] | void;
    __sooqyClearLogs?: () => void;
  }
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

  window.visualViewport?.addEventListener("resize", () => {
    logEvent("info", "visualViewport.resize", {
      height: window.visualViewport?.height,
      width: window.visualViewport?.width,
    });
  });

  logEvent("info", "diagnostics.started");
  exposeDiagnosticsToConsole();

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