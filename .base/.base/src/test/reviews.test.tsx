import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RatingSelector } from "@/components/sooqy/RatingSelector";

describe("RatingSelector", () => {
  it("allows rating and shows the selected value", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<RatingSelector onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "اختر 4 نجوم" }));
    fireEvent.click(screen.getByRole("button", { name: "إرسال التقييم" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(4, ""));
    expect(screen.getByText("4/5")).toBeInTheDocument();
  });
});
