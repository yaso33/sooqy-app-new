import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * نافذة تأكيد موحّدة للعمليات الحساسة (مثل الحذف).
 * تعمل باللمس على الهاتف: طبقة معتمة + بطاقة سفلية، مع إغلاق بمفتاح Escape.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/45 p-4 pb-8 sm:items-center"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="animate-scale-in w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-float"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-2xl border border-border bg-background py-3 text-sm font-bold transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "rounded-2xl py-3 text-sm font-bold text-white transition disabled:opacity-50",
              tone === "danger" ? "bg-danger" : "bg-primary",
            )}
          >
            {busy ? "جارٍ التنفيذ..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
