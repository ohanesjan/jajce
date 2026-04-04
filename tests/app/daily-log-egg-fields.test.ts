import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  calculateLiveEggsTotalYield,
  DailyLogEggFields,
} from "@/app/admin/(protected)/daily-logs/daily-log-egg-fields";

describe("DailyLogEggFields", () => {
  it("renders the live total-yield field from the current egg values", () => {
    const markup = renderToStaticMarkup(
      createElement(DailyLogEggFields, {
        initialValues: {
          eggs_collected_for_sale: 28,
          eggs_used_other_purpose: 2,
          eggs_broken: 1,
          eggs_unusable_other: 0,
        },
      }),
    );

    expect(markup).toContain('name="eggs_total_yield"');
    expect(markup).toContain('value="31"');
    expect(markup).not.toContain("Calculated on save");
  });

  it("sums the four egg fields for live display while treating blank values as zero", () => {
    expect(
      calculateLiveEggsTotalYield({
        eggs_collected_for_sale: "12",
        eggs_used_other_purpose: "",
        eggs_broken: "3",
        eggs_unusable_other: "  ",
      }),
    ).toBe(15);
  });
});
