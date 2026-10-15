import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating,
  size = "size-3.5",
  className,
  showValue = false,
}: {
  rating: number;
  size?: string;
  className?: string;
  showValue?: boolean;
}) {
  const value = Math.max(0, Math.min(5, rating));
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              size,
              i <= Math.round(value) ? "fill-warning text-warning" : "fill-neutral-200 text-neutral-200",
            )}
          />
        ))}
      </span>
      {showValue && <span className="text-xs font-semibold text-foreground">{value.toFixed(1)}</span>}
    </span>
  );
}