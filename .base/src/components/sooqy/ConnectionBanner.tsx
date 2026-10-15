import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useOnline } from "@/lib/conn";

/**
 * لافتة انقطاع الاتصال (بند 2.5):
 * تظهر عند فقدان الشبكة، وعند عودة الاتصال تُبطل الاستعلامات تلقائيًا
 * حتى تُحدَّث البيانات دون تدخل المستخدم. الحركة عبر transform فقط.
 */
export function ConnectionBanner() {
  const online = useOnline();
  const queryClient = useQueryClient();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (online) {
      // عودة الاتصال: أعد تحديث البيانات تلقائيًا
      if (wasOffline.current) {
        wasOffline.current = false;
        void queryClient.invalidateQueries();
      }
    } else {
      wasOffline.current = true;
    }
  }, [online, queryClient]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <div className="animate-fade-up flex items-center gap-2 rounded-full bg-warning px-4 py-2 text-xs font-bold text-warning-foreground shadow-lift">
        <WifiOff className="size-4 shrink-0" aria-hidden />
        <span>لا يوجد اتصال بالإنترنت — ستتم التحديث تلقائيًا بعد عودة الشبكة</span>
      </div>
    </div>
  );
}