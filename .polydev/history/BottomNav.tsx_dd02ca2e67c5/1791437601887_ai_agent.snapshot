import { Link } from "@tanstack/react-router";
import { Home, Map, Search, ShoppingBag, User } from "lucide-react";
import { useBag } from "@/lib/bag";

const items = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/map", label: "الخريطة", icon: Map },
  { to: "/explore", label: "البحث", icon: Search },
  { to: "/bag", label: "السلة", icon: ShoppingBag },
  { to: "/account", label: "حسابي", icon: User },
] as const;

export function BottomNav() {
  const { count } = useBag();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "!text-primary" }}
            >
              <span className="relative">
                <Icon className="size-5" />
                {to === "/bag" && count > 0 && (
                  <span className="absolute -top-1.5 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
