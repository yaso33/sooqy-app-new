import { useCallback, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pull-to-refresh wrapper for mobile touch. Only triggers when the page is
 * scrolled to the top, so it never fights the normal scroll.
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 72,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  threshold?: number;
}) {
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch && window.scrollY <= 0) {
      startY.current = touch.clientY;
      pulling.current = true;
    }
  }, []);

  const onTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch || !pulling.current || startY.current == null) return;
    const dy = touch.clientY - startY.current;
    if (dy > 0) setPull(Math.min(120, dy * 0.5));
  }, []);

  const finish = useCallback(async () => {
    pulling.current = false;
    startY.current = null;
    if (pull >= threshold) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, threshold, onRefresh]);

  return (
    <div
      className={className}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={finish}
      onTouchCancel={finish}
    >
      <div
        className={cn(
          "pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-200",
          (pull > 0 || refreshing) && "overflow-visible",
        )}
        style={{ height: refreshing ? 44 : pull }}
        aria-hidden="true"
      >
        <RefreshCw className={cn("size-5 text-muted-foreground", refreshing && "animate-spin")} />
      </div>
      {children}
    </div>
  );
}