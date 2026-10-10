import { cn } from "@/lib/utils";
import type { StockLevel } from "@/lib/sooqy";
import { BadgeCheck, Clock, XCircle, AlertTriangle } from "lucide-react";
import type { StoreStatus } from "@/lib/geo";

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

function getStatusConfig(status: StoreStatus) {
  if (status.label === "ساعات العمل غير متوفرة") {
    return {
      icon: AlertTriangle,
      bg: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
      dot: "bg-neutral-500",
    };
  }
  if (status.label === "مغلق مؤقتًا") {
    return {
      icon: XCircle,
      bg: "bg-warning-soft text-warning",
      dot: "bg-warning",
    };
  }
  if (status.isOpen) {
    return {
      icon: Clock,
      bg: "bg-success-soft text-success",
      dot: "bg-success live-dot",
    };
  }
  return {
    icon: XCircle,
    bg: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-neutral-500",
  };
}

export function OpenBadge({ 
  open, 
  className, 
  detailed = false,
  status 
}: { 
  open?: boolean; 
  className?: string; 
  detailed?: boolean;
  status?: StoreStatus;
}) {
  // If detailed status is provided, use it
  if (detailed && status) {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
          config.bg,
          className,
        )}
        title={status.description + (status.nextChange ? ` — ${status.nextChange}` : "")}
      >
        <span className={cn("size-1.5 rounded-full", config.dot)} />
        <Icon className="size-3" />
        {status.label}
        {status.nextChange && <span className="opacity-80">· {status.nextChange}</span>}
      </span>
    );
  }

  // Legacy simple badge
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