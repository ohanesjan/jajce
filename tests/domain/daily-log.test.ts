import { describe, expect, it } from "vitest";
import { calculateEggsTotalYield } from "@/lib/domain/daily-log";

describe("calculateEggsTotalYield", () => {
  it("adds the four daily egg outcome buckets", () => {
    expect(
      calculateEggsTotalYield({
        eggs_collected_for_sale: 42,
        eggs_used_other_purpose: 3,
        eggs_broken: 2,
        eggs_unusable_other: 1,
      }),
    ).toBe(48);
  });

  it("supports zero-value days", () => {
    expect(
      calculateEggsTotalYield({
        eggs_collected_for_sale: 0,
        eggs_used_other_purpose: 0,
        eggs_broken: 0,
        eggs_unusable_other: 0,
      }),
    ).toBe(0);
  });
});
