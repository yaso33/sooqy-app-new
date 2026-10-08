import { cn } from "@/lib/utils";
import type { StockLevel } from "@/lib/sooqy";
import { BadgeCheck } from "lucide-react";

export function StockBadge({ level, className }: { level: StockLevel; className?: string }) {
  const map = {
    in: { text: "متوفر الآن", cls: "bg-success/12 text-success", dot: "bg-success live-dot" },
    low: { text: "كمية محدودة", cls: "bg-warning/15 text-warning", dot: "bg-warning" },
    out: { text: "نفد من المخزون", cls: "bg-danger/10 text-danger", dot: "bg-danger" },
  }[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", map.cls, className)}>
      <span className={cn("size-1.5 rounded-full", map.dot)} />
      {map.text}
    </span>
  );
}

export function OpenBadge({ open }: { open: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", open ? "bg-success/12 text-success" : "bg-muted text-muted-foreground")}>
      <span className={cn("size-1.5 rounded-full", open ? "bg-success live-dot" : "bg-muted-foreground")} />
      {open ? "مفتوح الآن" : "مغلق"}
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
      <BadgeCheck className="size-3.5" /> متجر موثق
    </span>
  );
}
