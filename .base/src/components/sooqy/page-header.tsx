import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-center gap-3", className)}>
      {back && (
        <Link
          to={back}
          aria-label="رجوع"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card shadow-soft transition hover:bg-neutral-100 active:scale-95 dark:hover:bg-neutral-800"
        >
          <ChevronRight className="size-5 rtl:rotate-180" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}