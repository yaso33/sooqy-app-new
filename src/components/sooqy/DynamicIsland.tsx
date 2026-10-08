import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { Clock, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useBag } from "@/lib/bag";
import { fetchMyOrders, fetchMyReservations } from "@/lib/sooqy";

export function useCountdown(to: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!to) return null;
  const ms = Math.max(0, new Date(to).getTime() - now);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, label: `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` };
}

export function DynamicIsland() {
  const { user } = useAuth();
  const { count } = useBag();
  const { pathname } = useLocation();
  const res = useQuery({ queryKey: ["my-reservations"], queryFn: fetchMyReservations, enabled: !!user, refetchInterval: 60000 });
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: fetchMyOrders, enabled: !!user });
  const active = res.data?.find((r) => r.status === "pending" && new Date(r.expires_at).getTime() > Date.now());
  const shipping = orders.data?.find((o) => o.status === "confirmed" || o.status === "shipped");
  const cd = useCountdown(active?.expires_at ?? null);

  const hideBag = pathname.startsWith("/bag") || pathname.startsWith("/checkout") || pathname.startsWith("/studio");

  return (
    <>
      {(active || shipping) && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[env(safe-area-inset-top)]">
          <Link
            to="/account"
            className="pointer-events-auto mt-2 flex animate-fade-up items-center gap-2.5 rounded-full border border-border/50 bg-ink px-4 py-2 text-xs text-ink-foreground shadow-lift"
          >
            {active ? (
              <>
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Clock className="size-3.5" />
                </span>
                <span className="font-mono font-bold tracking-widest text-primary">{active.code}</span>
                <span className="opacity-70">الاستلام خلال</span>
                <span className="font-mono font-bold tabular-nums text-primary">{cd?.label}</span>
              </>
            ) : (
              <>
                <span className="flex size-6 items-center justify-center rounded-full bg-success/20 text-success">
                  {shipping!.status === "shipped" ? <Truck className="size-3.5" /> : <PackageCheck className="size-3.5" />}
                </span>
                <span className="font-bold">
                  {shipping!.status === "shipped" ? "طلبك في الطريق 🚚" : "طلبك مؤكد ✅"}
                </span>
                <span className="opacity-60">تتبّع الآن</span>
              </>
            )}
          </Link>
        </div>
      )}
      {count > 0 && !hideBag && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
          <Link
            to="/bag"
            className="flex animate-fade-up items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-pop transition hover:brightness-105 active:scale-[0.98]"
          >
            <ShoppingBag className="size-4" />
            {count} {count === 1 ? "سلعة" : "سلع"} في سلة التسوق — أكمل الطلب
          </Link>
        </div>
      )}
    </>
  );
}