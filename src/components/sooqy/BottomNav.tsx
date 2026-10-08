import { Link } from "@tanstack/react-router";
import { Compass, Home, Map, ShoppingBag, User } from "lucide-react";
import { useBag } from "@/lib/bag";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/map", label: "الخريطة", icon: Map },
  { to: "/explore", label: "اكتشف", icon: Compass },
  { to: "/bag", label: "السلة", icon: ShoppingBag },
  { to: "/account", label: "حسابي", icon: User },
] as const;

export function BottomNav() {
  const { count } = useBag();
  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "!text-primary", "aria-current": "page" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "absolute top-1.5 h-7 w-12 rounded-full transition-all duration-300",
                      isActive ? "bg-primary-soft" : "opacity-0 group-hover:opacity-60",
                    )}
                    aria-hidden="true"
                  />
                  <span className="relative">
                    <Icon
                      className={cn("size-[22px] transition-transform duration-300", isActive && "scale-105")}
                      strokeWidth={isActive ? 2.4 : 2}
                    />
                    {to === "/bag" && count > 0 && (
                      <span className="absolute -top-1.5 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-scale-in">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                  <span className="relative">{label}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}