import React, { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** عنوان قسم صغير فوق قائمة موحّدة. */
export const SectionTitle = React.memo(function SectionTitle({
  children,
}: {
  children: ReactNode;
}) {
  return <h2 className="px-1 pt-1 text-sm font-bold text-muted-foreground">{children}</h2>;
});

/** بطاقة قائمة بقسمين مفصولين بحدود خفيفة (بدون ازدحام). */
export const MenuCard = React.memo(function MenuCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
});

/**
 * صف قائمة موحّد: أيقونة في مربع ناعم + عنوان + وصف + سهم تنقل (يشير لليسار مع RTL).
 * - `to`: ينتقل لمسار موجود.
 * - `soon`: ميزة غير منفذة — تظهر شارة «قريبًا» ويعرض توست عند الضغط.
 * - `onClick`: إجراء مخصص (مثل تبديل تبويب).
 */
export const MenuRow = React.memo(function MenuRow({
  icon: Icon,
  label,
  hint,
  to,
  onClick,
  danger,
  soon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
  soon?: boolean;
}) {
  const content = (
    <>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          danger ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-bold",
            danger ? "text-danger" : "text-foreground",
          )}
        >
          {label}
        </span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      {soon && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          قريبًا
        </span>
      )}
      <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
    </>
  );

  const cls =
    "flex w-full items-center gap-3 p-3.5 text-right transition active:bg-muted/40 disabled:opacity-50";

  if (to) {
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      onClick={() => (soon ? toast.info("هذه الميزة ستتاح قريبًا") : onClick?.())}
    >
      {content}
    </button>
  );
});
