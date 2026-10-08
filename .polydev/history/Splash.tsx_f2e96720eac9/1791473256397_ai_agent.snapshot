import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * شاشة البداية — تظهر لحظيًا عند كل تشغيل ثم تختفي بسلاسة.
 * واجهة فقط، بلا أي بيانات.
 */
export function Splash() {
  const [phase, setPhase] = useState<"show" | "hide" | "gone">("show");

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
      <img
        src="/splash.png"
        alt="SooQy"
        className="h-full w-full object-cover animate-scale-in"
      />
    </div>
  );
}
