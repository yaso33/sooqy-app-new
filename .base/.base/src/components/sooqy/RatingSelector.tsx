import { Star } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function RatingSelector({
  onSubmit,
  disabled = false,
  label = "تقييمك",
  compact = false,
}: {
  onSubmit: (rating: number, comment?: string) => Promise<void> | void;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const groupId = useId();

  const submit = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onSubmit(rating, comment);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-sm font-bold text-warning">{rating}/5</span>
      </div>
      <div role="group" aria-label={label} className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`اختر ${value} نجوم`}
            aria-pressed={value === rating}
            disabled={busy || disabled}
            onClick={() => setRating(value)}
            className="rounded-xl p-1.5 transition"
          >
            <Star
              className={cn(
                "size-7 transition",
                value <= rating ? "fill-warning text-warning" : "text-muted-foreground",
              )}
            />
            <span className="sr-only">{value} نجوم</span>
          </button>
        ))}
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">ملاحظاتك (اختياري)</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          placeholder="اكتب رأيك في المنتج أو المحل..."
          className="w-full rounded-2xl border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={busy || disabled}
        className="w-full rounded-2xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "جارٍ الإرسال..." : "إرسال التقييم"}
      </button>
      <input id={groupId} type="hidden" value={rating} readOnly />
    </div>
  );
}
