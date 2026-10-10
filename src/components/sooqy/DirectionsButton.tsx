import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { geoErrorMessage, useGeo } from "@/lib/geo";
import { cn } from "@/lib/utils";

/**
 * زر «الاتجاهات» — يفتح خرائط جوجل للوجهة.
 * إن كان إذن الموقع مرفوضًا سابقًا، يطلب الإذن مرة أخرى قبل الفتح
 * حتى لا ينتهي الأمر برسالة بلا فعل.
 */
export function DirectionsButton({
  lat,
  lng,
  label,
  className,
  children,
  ariaLabel = "الاتجاهات إلى المتجر",
}: {
  lat?: number | null;
  lng?: number | null;
  label: string;
  className?: string;
  children?: ReactNode;
  ariaLabel?: string;
}) {
  const { pos, ask, locating } = useGeo();
  const [busy, setBusy] = useState(false);

  const open = () => {
    const q =
      lat != null && lng != null
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
    window.open(q, "_blank", "noopener,noreferrer");
  };

  const onClick = async () => {
    // لا داعي لإزعاج المستخدم إن كان الموقع متاحًا أصلًا
    if (pos) {
      open();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const res = await ask();
      if (res.pos) {
        open();
      } else {
        toast.error(geoErrorMessage(res.reason));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-busy={busy || locating}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onClick();
      }}
      className={cn("transition active:scale-95", busy && "opacity-60", className)}
    >
      {children}
    </button>
  );
}