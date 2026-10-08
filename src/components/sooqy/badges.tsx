import { cn } from "@/lib/utils";
import type { StockLevel } from "@/lib/sooqy";
import { BadgeCheck } from "lucide-react";

export function StockBadge({ level, className }: { level: StockLevel; className?: string }) {
  const map = {
    in: { text: "متوفر الآن", cls: "bg-success-soft text-success", dot: "bg-success live-dot" },
    low: { text: "كمية محدودة", cls: "bg-warning-soft text-warning", dot: "bg-warning" },
    out: { text: "نفد من المخزون", cls: "bg-danger-soft text-danger", dot: "bg-danger" },
  }[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", map.cls, className)}>
      <span className={cn("size-1.5 rounded-full", map.dot)} />
      {map.text}
    </span>
  );
}

export function OpenBadge({ open, className }: { open: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
        open ? "bg-success-soft text-success" : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", open ? "bg-success live-dot" : "bg-neutral-500")} />
      {open ? "مفتوح الآن" : "مغلق"}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold text-primary", className)}>
      <BadgeCheck className="size-3.5" /> متجر موثق
    </span>
  );
}