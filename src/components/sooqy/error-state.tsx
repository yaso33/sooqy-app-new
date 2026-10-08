import { cn } from "@/lib/utils";

export function ErrorState({
  title = "تعذّر التحميل",
  hint = "تحقق من اتصالك بالإنترنت ثم أعد المحاولة.",
  onRetry,
  className,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-2xl">⚠️</span>
      <p className="text-sm font-bold text-foreground">{title}</p>
      {hint && <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-1">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}