import { Link } from "@tanstack/react-router";
import { Compass, Globe, Home, Map, ShoppingBag, User } from "lucide-react";
import { useBag } from "@/lib/bag";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", labelKey: "home", icon: Home },
  { to: "/map", labelKey: "explore", icon: Map },
  { to: "/explore", labelKey: "search", icon: Compass },
  { to: "/bag", labelKey: "cart", icon: ShoppingBag },
  { to: "/profile", labelKey: "profile", icon: User },
] as const;

export function BottomNav() {
  const { count } = useBag();
  const { lang, t, switchLang, isRTL } = useTranslation();
  return (
    <nav
      aria-label={isRTL ? "التنقل الرئيسي" : "Main navigation"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {items.map(({ to, labelKey, icon: Icon }) => (
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
                      className={cn(
                        "size-[22px] transition-transform duration-300",
                        isActive && "scale-105",
                      )}
                      strokeWidth={isActive ? 2.4 : 2}
                    />
                    {to === "/bag" && count > 0 && (
                      <span className="absolute -top-1.5 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-scale-in">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                  <span className="relative w-full truncate px-0.5 text-center">{t(labelKey)}</span>
                </>
              )}
            </Link>
          </li>
        ))}
        <li>
          <button
            onClick={() => switchLang(lang === "ar" ? "en" : "ar")}
            aria-label={isRTL ? "تغيير اللغة" : "Change language"}
            className="relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors"
          >
            <span
              className={cn(
                "absolute top-1.5 h-7 w-12 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-60",
              )}
              aria-hidden="true"
            />
            <span className="relative">
              <Globe className="size-[22px]" />
            </span>
            <span className="relative w-full truncate px-0.5 text-center">{t("language")}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
