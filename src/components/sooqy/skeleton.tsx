import { cn } from "@/lib/utils";

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-card shadow-soft", className)}>
      <div className="aspect-square animate-pulse bg-neutral-200" />
      <div className="space-y-2 p-3">
        <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-neutral-200" />
      </div>
    </div>
  );
}

export function StoreCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-2xl bg-card p-3 shadow-soft", className)}>
      <div className="size-20 shrink-0 animate-pulse rounded-xl bg-neutral-200" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-neutral-200" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StoreCardSkeleton key={i} />
      ))}
    </div>
  );
}