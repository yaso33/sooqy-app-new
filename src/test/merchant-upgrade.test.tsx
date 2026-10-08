import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MerchantUpgradeCard } from "@/components/sooqy/MerchantUpgradeCard";

describe("MerchantUpgradeCard", () => {
  it("becomes a merchant once and shows a loading state", async () => {
    const onBecomeMerchant = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    render(<MerchantUpgradeCard isMerchant={false} onBecomeMerchant={onBecomeMerchant} />);

    const button = screen.getByRole("button", { name: "أصبح تاجرًا" });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("جارٍ تحويل الحساب...");
    await waitFor(() => expect(onBecomeMerchant).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText("تم تفعيل حساب التاجر بنجاح.")).toBeInTheDocument(),
    );
  });
});
