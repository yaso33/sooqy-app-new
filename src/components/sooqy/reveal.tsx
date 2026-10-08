import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ظهور متدرج (staggered fade-up) للبطاقات في الشبكات.
 * يستخدم transform/opacity فقط مع تأخير تدريجي حسب الترتيب.
 */
export function Reveal({
  children,
  index = 0,
  className,
  style,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const delay = Math.min(index * 45, 300);
  return (
    <div
      className={cn("animate-fade-up", className)}
      style={{ animationDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}