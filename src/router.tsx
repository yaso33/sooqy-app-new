import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // البيانات تبقى "طازجة" دقيقة كاملة
        gcTime: 10 * 60_000, // تُحفظ في الذاكرة 10 دقائق
        retry: 2,
        refetchOnWindowFocus: false, // لا نعيد الجلب عند كل تركيز على النافذة
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // تغيير الصفحة = قفزة فورية للأعلى (لا تمرير ناعم) لأن الصفحة تُعاد بناؤها مع حركة fade-up
    scrollRestorationBehavior: "instant",
    defaultPreload: "intent", // تحميل مسبق عند التمرير على الروابط (hover)
    defaultPreloadStaleTime: 0,
  });

  return router;
};