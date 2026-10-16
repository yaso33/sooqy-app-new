import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

// صائد أخطاء الشاشة — يجب أن يُستورد أولًا ليعتمد قبل أي طبقة أخرى (يتجاهل SSR)
import "@/lib/screen-error";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { BagProvider } from "@/lib/bag";
import { BottomNav } from "@/components/sooqy/BottomNav";
import { ConnectionBanner } from "@/components/sooqy/ConnectionBanner";
import { DynamicIsland } from "@/components/sooqy/DynamicIsland";
import { PageTransition } from "@/components/sooqy/page-transition";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير موجودة أو تغيّرت.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            رجوع للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">تعذّر تحميل الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          حدث خطأ ما. حاول مرة أخرى أو ارجع إلى الرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border bg-card px-4 py-2 text-sm font-medium"
          >
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#F8FAFC" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "SOOQY — شاهد السلعة قبل الخروج" },
      { name: "description", content: "SOOQY سوق جزائري: شاهد السلعة قبل الخروج للبحث عنها. منتج، متجر،صناعة،طلب وتتبع." },
      { name: "keywords", content: "سوق جزائري, منتجات الجزائر, متاجر الجزائر, توصيل الجزائر, SOOQY, شراء الجزائر" },
      { name: "author", content: "SOOQY" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "SOOQY" },
      { property: "og:locale", content: "ar_DZ" },
      { property: "og:image", content: "https://sooqy.app/seo/og.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SOOQY — شاهد السلعة قبل الخروج" },
      { name: "twitter:description", content: "SOOQY سوق جزائري: شاهد السلعة قبل الخروج للبحث عنها." },
      { name: "twitter:image", content: "https://sooqy.app/seo/og.svg" },
    ],
    links: [
      // appCss يreference "" في بيئة الاختبار فقط — تجاهله حتى لا يُرسم <link> بـhref فارغ
      ...(appCss ? [{ rel: "stylesheet", href: appCss }] : []),
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.gstatic.com" },
      { rel: "preconnect", href: "https://cdn.jsdelivr.net", crossOrigin: "anonymous" },
      { rel: "preload", href: "/seo/og.svg", as: "image" },
      { rel: "sitemap", href: "/sitemap.xml", type: "application/xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BagProvider>
          <div className="mx-auto min-h-screen max-w-xl pb-28">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
          <ConnectionBanner />
          <DynamicIsland />
          <BottomNav />
          <Toaster position="top-center" richColors />
        </BagProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
