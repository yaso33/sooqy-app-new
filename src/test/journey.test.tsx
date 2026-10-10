import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createRouter, type Router } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { resetSupabaseFake, setSession, state } from "./supabase-fake";

// استبدال عميل Supabase الحقيقي بالـfake (لا شبكة، بيانات ثابتة)
vi.mock("@/integrations/supabase/client", async () => {
  const { fakeSupabase } = await import("./supabase-fake");
  return { supabase: fakeSupabase };
});
// شاشات لا علاقة لها بالتدفقات
vi.mock("@/components/sooqy/Splash", () => ({ Splash: () => null }));
vi.mock("@/components/sooqy/OnboardingGate", () => ({ OnboardingGate: () => null }));
// طبقة تشخيص الشاشة — لا علاقة لها بمنطق التطبيق وحرّاسها يلوّثون DOM الاختبارات
vi.mock("@/lib/screen-error", () => ({}));
// WebGL غير متاح في jsdom — الخريطة تُستبدل بعنصر بسيط
vi.mock("@/components/sooqy/StoreMap", () => ({
  default: () => <div>خريطة تجريبية</div>,
}));

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createRouter({ routeTree, context: { queryClient } });
  render(<RouterProvider router={router} />);
  return router;
}

async function go(
  router: Router,
  to: string,
  params?: Record<string, string>,
  search?: Record<string, unknown>,
) {
  await act(async () => {
    await router.navigate({ to: to as never, params: params as never, search: search as never });
  });
}

async function expectText(text: string | RegExp) {
  await waitFor(() => expect(screen.getAllByText(text).length).toBeGreaterThan(0));
}

describe("جولة المستخدم — كل صفحة تُرسم بمحتواها", () => {
  beforeEach(() => {
    resetSupabaseFake();
    localStorage.clear();
  });

  const SMOKE: Array<{
    to: string;
    params?: Record<string, string>;
    expect?: string | RegExp;
    placeholder?: string;
  }> = [
    { to: "/", expect: "SooQy" },
    { to: "/explore", expect: "اكتشف" },
    { to: "/stores", expect: "المتاجر" },
    { to: "/stores/$storeId", params: { storeId: "store-1" }, expect: "متجر التجربة" },
    { to: "/category/$catId", params: { catId: "shoes" }, expect: "أحذية" },
    { to: "/products/$productId", params: { productId: "prod-1" }, expect: "حذاء رياضي" },
    { to: "/map", placeholder: "ابحث عن متجر أو مكان..." },
    { to: "/bag", expect: "سلة التسوق" },
    { to: "/checkout", expect: "تحتاج لدخول الحساب" },
    { to: "/favorites", expect: "المفضلة" },
    { to: "/account", expect: "سجّل الدخول لحسابك" },
    { to: "/settings", expect: "الإعدادات" },
    { to: "/profile", expect: "سجّل الدخول لتخصيص ملفك" },
    { to: "/notifications", expect: "الإشعارات" },
    { to: "/orders", expect: "سجّل الدخول لعرض طلباتك" },
    { to: "/orders/$orderId", params: { orderId: "order-1" }, expect: "سجّل الدخول لتتبع طلبك" },
    { to: "/studio", expect: "لوحة التاجر" },
    { to: "/studio/settings", expect: "تخصيص المتجر" },
    { to: "/help", expect: "مساعدة والأسئلة الشائعة" },
    { to: "/terms", expect: "شروط الاستخدام" },
    { to: "/privacy", expect: "سياسة الخصوصية" },
    { to: "/auth", expect: /SOOQY/ },
  ];

  it.each(SMOKE)("الصفحة $to تُرسم", async ({ to, params, expect: expected, placeholder }) => {
    const router = renderApp();
    await go(router, to, params);
    if (placeholder) {
      await waitFor(() => expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument());
    } else {
      await expectText(expected!);
    }
  });
});

describe("جولة المستخدم — تدفقات حقيقية", () => {
  beforeEach(() => {
    resetSupabaseFake();
    localStorage.clear();
  });

  it("متابعة متجر من صفحته تُظهره في المفضلة", async () => {
    const router = renderApp();
    await go(router, "/stores/$storeId", { storeId: "store-1" });

    const follow = await screen.findByRole("button", { name: /متابعة المتجر/ });
    fireEvent.click(follow);

    await waitFor(() => {
      const favs = JSON.parse(localStorage.getItem("sooqy:favorites") ?? "{}") as {
        stores?: string[];
      };
      expect(favs.stores).toContain("store-1");
    });
    expect(await screen.findByRole("button", { name: /إلغاء المتابعة/ })).toBeInTheDocument();

    await go(router, "/favorites");
    fireEvent.click(screen.getByRole("button", { name: /المتاجر \(1\)/ }));
    await expectText("متجر التجربة");
  });

  it("إضافة منتج للسلة ثم زيادة الكمية ثم إفراغ السلة", async () => {
    const router = renderApp();
    await go(router, "/products/$productId", { productId: "prod-1" });

    const add = await screen.findByRole("button", { name: /أضف إلى السلة/ });
    fireEvent.click(add);

    await go(router, "/bag");
    await expectText("حذاء رياضي");

    fireEvent.click(screen.getByRole("button", { name: "زيادة الكمية" }));
    await expectText("الإجمالي (2 منتج)");

    fireEvent.click(screen.getByRole("button", { name: "حذف من السلة" }));
    await expectText("سلتك فارغة");
  });

  it("البحث من الرئيسية ينتقل إلى نتائج الاستكشاف بالكلمة", async () => {
    const router = renderApp();
    await go(router, "/");

    fireEvent.change(screen.getByLabelText("بحث"), { target: { value: "حذاء" } });
    fireEvent.click(screen.getByRole("button", { name: "ابحث" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/explore"));
    expect(router.state.location.search.q).toBe("حذاء");
    await expectText("حذاء رياضي");
  });

  it("تاجر بلا متجر ينشئ متجره من الاستوديو وتظهر اللوحة", async () => {
    setSession({ id: "user-2", email: "tajir@test.dz" });
    const router = renderApp();
    await go(router, "/studio");

    await expectText("أنشئ متجر SOOQY");

    fireEvent.change(screen.getByPlaceholderText("اسم المتجر"), {
      target: { value: "متجري الجديد" },
    });
    fireEvent.change(screen.getByPlaceholderText("هاتف المتجر"), {
      target: { value: "0551234567" },
    });
    fireEvent.change(screen.getByPlaceholderText("البلدية"), { target: { value: "باب الزوار" } });
    fireEvent.change(screen.getByPlaceholderText("العنوان"), { target: { value: "حي 5 جويلية" } });
    fireEvent.change(screen.getByLabelText("اختيار الولاية"), { target: { value: "16" } });

    fireEvent.click(screen.getByRole("button", { name: "فتح المتجر" }));

    await waitFor(() =>
      expect(state.calls.some((c) => c.startsWith("rpc.become_merchant"))).toBe(true),
    );
    await waitFor(() => expect(state.calls.some((c) => c.startsWith("stores.insert"))).toBe(true));

    // بعد التحديث تظهر لوحة التاجر مع اسم المتجر الجديد
    await expectText("استوديو التاجر");
    await expectText("متجري الجديد");
  });

  it("تاجر لديه متجر يصل لصفحة تخصيص المتجر من اللوحة", async () => {
    setSession({ id: "user-1", email: "malik@test.dz" });
    const router = renderApp();
    await go(router, "/studio");

    await expectText("استوديو التاجر");
    fireEvent.click(await screen.findByRole("link", { name: /تخصيص المتجر/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/studio/settings"));
    await expectText("هوية متجرك تظهر للعملاء في صفحته");
  });

  it("إتمام طلب كامل: سلة ← عنوان ← توصيل ← دفع ← تأكيد", async () => {
    setSession({ id: "user-1", email: "malik@test.dz" });
    const router = renderApp();

    // نضيف منتجًا للسلة من صفحته
    await go(router, "/products/$productId", { productId: "prod-1" });
    fireEvent.click(await screen.findByRole("button", { name: /أضف إلى السلة/ }));

    await go(router, "/checkout");
    await expectText("سلعك (1)");

    // الخطوة 1: العنوان والولاية
    fireEvent.click(screen.getByRole("button", { name: "متابعة" }));
    await expectText("العنوان والولاية");
    // ننتظر تحميل الولايات حتى يوجد خيار value="16" فعلًا
    await screen.findByRole("option", { name: /16 - الجزائر/ });
    fireEvent.change(screen.getByLabelText("اختيار الولاية"), { target: { value: "16" } });
    fireEvent.change(screen.getByPlaceholderText("البلدية"), {
      target: { value: "الجزائر الوسطى" },
    });
    fireEvent.change(screen.getByPlaceholderText("الاسم الكامل"), {
      target: { value: "محمد أمين" },
    });
    fireEvent.change(screen.getByPlaceholderText("رقم الهاتف"), {
      target: { value: "0551234567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "متابعة" }));

    // الخطوة 2: التوصيل
    await expectText("طريقة التوصيل");
    fireEvent.click(screen.getByRole("button", { name: /توصيل للمنزل/ }));
    fireEvent.click(screen.getByRole("button", { name: "متابعة" }));

    // الخطوة 3: الدفع عند الاستلام (افتراضي)
    await expectText("طريقة الدفع");
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    // شاشة النجاح
    await expectText("تم تأكيد طلبك!");
    await expectText(/رمز التتبع/);
    await waitFor(() =>
      expect(state.calls.some((c) => c.startsWith("rpc.create_order"))).toBe(true),
    );
    // السلة فُرشت بعد الطلب
    await go(router, "/bag");
    await expectText("سلتك فارغة");
  });

  it("إرسال تقييم لمنتج يظهر تأكيد «قمت بتقييم هذا العنصر»", async () => {
    setSession({ id: "user-1", email: "malik@test.dz" });
    const router = renderApp();
    await go(router, "/products/$productId", { productId: "prod-1" });

    await expectText("قيّم هذا العنصر");
    fireEvent.click(screen.getByRole("button", { name: "اختر 4 نجوم" }));
    fireEvent.click(screen.getByRole("button", { name: "إرسال التقييم" }));

    await expectText("قمت بتقييم هذا العنصر 4/5");
    await waitFor(() =>
      expect(state.calls.some((c) => c.startsWith("rpc.submit_review"))).toBe(true),
    );
    expect(state.reviews).toHaveLength(1);
  });
});
