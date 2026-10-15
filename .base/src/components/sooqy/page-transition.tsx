import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

/**
 * Wraps routed content and re-mounts it on navigation so the fade-up
 * entrance animation plays on every page change (transform/opacity only).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  );
}