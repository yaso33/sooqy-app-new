import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SPLASH_IMAGE } from "./intro-assets";

/**
 * شاشة البداية — تظهر لحظيًا عند كل تشغيل ثم تختفي بسلاسة.
 * تعرض صورة `SPLASH_IMAGE` (من public/intro/)؛ لو كانت مفقودة
 * يظهر تصميم هوية Indigo افتراضي حتى تُرفع الصورة.
 */
export function Splash() {
  const [phase, setPhase] = useState<"show" | "hide" | "gone">("show");
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hide"), 1500);
    const t2 = setTimeout(() => setPhase("gone"), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-card transition-opacity duration-500",
        phase === "hide" && "pointer-events-none opacity-0",
      )}
    >
      {imgFailed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-primary-soft via-background to-background animate-scale-in">
          <span className="text-5xl font-extrabold tracking-tight text-primary">SooQy</span>
          <span className="text-sm font-semibold text-muted-foreground">
            شاهد السلعة قبل الخروج
          </span>
        </div>
      ) : (
        <img
          src={SPLASH_IMAGE}
          alt="SooQy"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover animate-scale-in"
        />
      )}
    </div>
  );
}
