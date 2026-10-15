// شاشة سجل التشخيص — تُفتح من التطبيق عبر زر 📋 (5 ضغطات سريعة تُفعّله)
// أو مباشرة: https://localhost/diagnostics.html داخل WebView.
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import "./styles.css";
import { initDiagnostics, clearDiagnosticLogs } from "./utils/diagnostics";

type LogEntry = {
  time: string;
  level: "info" | "warn" | "error";
  event: string;
  details?: Record<string, unknown> | undefined;
};

const STORAGE_KEY = "sooqy_diagnostics_v1";
const HB_KEY = "sooqy:hb";

function readLogs(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function readHeartbeat(): number[] {
  try {
    return JSON.parse(localStorage.getItem(HB_KEY) || "[]");
  } catch {
    return [];
  }
}

function readDevice() {
  return {
    userAgent: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height}`,
    dpr: window.devicePixelRatio,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    lang: navigator.language,
  };
}

const levelColor: Record<string, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800",
};

function DiagnosticsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hb, setHb] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initDiagnostics();
    const t = setInterval(() => {
      setLogs(readLogs());
      setHb(readHeartbeat());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const lastHb = hb.length ? hb[hb.length - 1] : 0;
  const hbAgeSec = lastHb ? Math.round((now - lastHb) / 1000) : -1;
  let maxGap = 0;
  for (let i = 1; i < hb.length; i++) {
    const prev = hb[i - 1] ?? 0;
    const cur = hb[i] ?? 0;
    maxGap = Math.max(maxGap, cur - prev);
  }

  const copy = async () => {
    const payload = {
      device: readDevice(),
      capturedAt: new Date().toISOString(),
      heartbeat: hb,
      logs,
    };
    try {
      const text = JSON.stringify(payload, null, 2);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <h1 className="text-lg font-bold">سجل تشخيص SooQy</h1>
        <p className="text-xs text-muted-foreground">
          يتحدّث كل ثانية — أعد إنتاج التجمّد ثم ارجع إلى هذه الشاشة
        </p>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {/* حالة النبضة */}
        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold">{hbAgeSec >= 0 ? `${hbAgeSec}ث` : "—"}</div>
            <div className="text-xs text-muted-foreground">آخر نبضة</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold">{maxGap > 0 ? `${Math.round(maxGap)}ms` : "—"}</div>
            <div className="text-xs text-muted-foreground">أقصى فجوة</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-xs text-muted-foreground">حدث مسجّل</div>
          </div>
        </section>

        {hbAgeSec > 5 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            ⚠️ النبضة توقفت قبل {hbAgeSec} ثانية — خيط JavaScript كان
            مشغولًا/متجمدًا في تلك اللحظة.
          </div>
        )}

        {/* حقل اختبار لإعادة إنتاج المشكلة */}
        <section className="rounded-xl border border-border bg-card p-3">
          <label className="mb-1 block text-sm font-medium">
            حقل اختبار — اكتب هنا لإعادة إنتاج المشكلة:
          </label>
          <input
            type="text"
            dir="ltr"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary"
            placeholder="اكتب هنا..."
          />
        </section>

        {/* أزرار */}
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white active:opacity-80"
          >
            {copied ? "✓ نُسخ!" : "نسخ اللوج (JSON)"}
          </button>
          <button
            onClick={() => {
              clearDiagnosticLogs();
              setLogs([]);
            }}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground active:opacity-80"
          >
            مسح
          </button>
        </div>

        {/* معلومات الجهاز */}
        <details className="rounded-xl border border-border bg-card p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            معلومات الجهاز (انسخها مع اللوج — مهمة)
          </summary>
          <pre
            dir="ltr"
            className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground"
          >
            {JSON.stringify(readDevice(), null, 2)}
          </pre>
        </details>

        {/* اللوج */}
        <section className="space-y-1.5">
          {logs.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              لا أحداث بعد — انتظر ثوانٍ أو اكتب في الحقل أعلاه.
            </p>
          )}
          {[...logs].reverse().map((e, i) => {
            const details = e.details;
            return (
              <div
                key={i}
                className={`rounded-lg border px-3 py-2 text-xs ${levelColor[e.level] || levelColor["info"]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{e.event}</span>
                  <span dir="ltr" className="shrink-0 text-[10px] opacity-70">
                    {e.time.slice(11, 23)}
                  </span>
                </div>
                {details && Object.keys(details).length > 0 && (
                  <pre
                    dir="ltr"
                    className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-[10px] opacity-80"
                  >
                    {JSON.stringify(details)}
                  </pre>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<DiagnosticsPage />);