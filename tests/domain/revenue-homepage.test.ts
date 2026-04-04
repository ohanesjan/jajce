import { describe, expect, it } from "vitest";
import { deriveHomepageAvailabilityMessage } from "@/lib/domain/homepage";
import { getRevenueRecognitionDate } from "@/lib/domain/revenue";

describe("getRevenueRecognitionDate", () => {
  it("prefers fulfilled_at when present", () => {
    const date = new Date("2026-04-01T00:00:00.000Z");
    const fulfilled_at = new Date("2026-04-02T09:15:00.000Z");

    expect(
      getRevenueRecognitionDate({
        date,
        fulfilled_at,
      }).toISOString(),
    ).toBe("2026-04-02T09:15:00.000Z");
  });

  it("falls back to the order date when fulfilled_at is missing", () => {
    const date = new Date("2026-04-01T00:00:00.000Z");

    expect(
      getRevenueRecognitionDate({
        date,
        fulfilled_at: null,
      }).toISOString(),
    ).toBe("2026-04-01T00:00:00.000Z");
  });
});

describe("deriveHomepageAvailabilityMessage", () => {
  it("returns the empty-stock soft message", () => {
    expect(
      deriveHomepageAvailabilityMessage({
        available_eggs: 0,
        low_stock_threshold: 30,
      }),
    ).toEqual({
      state: "none",
      message: "Моментално нема достапни јајца",
    });
  });

  it("returns the limited-stock soft message", () => {
    expect(
      deriveHomepageAvailabilityMessage({
        available_eggs: 12,
        low_stock_threshold: 30,
      }),
    ).toEqual({
      state: "limited",
      message: "Ограничена достапност",
    });
  });

  it("keeps the threshold boundary in the limited state", () => {
    expect(
      deriveHomepageAvailabilityMessage({
        available_eggs: 30,
        low_stock_threshold: 30,
      }),
    ).toEqual({
      state: "limited",
      message: "Ограничена достапност",
    });
  });

  it("supports the English locale for the existing bilingual homepage", () => {
    expect(
      deriveHomepageAvailabilityMessage({
        available_eggs: 31,
        low_stock_threshold: 30,
        locale: "en",
      }),
    ).toEqual({
      state: "available",
      message: "Fresh eggs are available",
    });
  });
});
