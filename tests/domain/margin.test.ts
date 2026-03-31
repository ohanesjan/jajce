import { describe, expect, it } from "vitest";
import {
  calculateDailyMarginMetrics,
  calculateSevenDaySummary,
  calculateThirtyDaySummary,
} from "@/lib/domain/margin";

describe("calculateDailyMarginMetrics", () => {
  it("calculates daily margin, cost, and productivity metrics", () => {
    expect(
      calculateDailyMarginMetrics({
        eggs_total_yield: 50,
        eggs_collected_for_sale: 40,
        daily_sold_eggs: 20,
        chicken_count: 10,
        revenue: 640,
        direct_cost: 180,
        allocated_cost: 40,
      }),
    ).toEqual({
      eggs_total_yield: 50,
      eggs_collected_for_sale: 40,
      daily_sold_eggs: 20,
      chicken_count: 10,
      revenue: 640,
      direct_cost: 180,
      allocated_cost: 40,
      total_cost: 220,
      gross_margin: 420,
      direct_margin: 460,
      cost_per_collected_egg: 5.5,
      margin_per_sold_egg: 21,
      total_yield_per_chicken: 5,
      sale_yield_per_chicken: 4,
    });
  });

  it("returns null for per-unit metrics when the divisor is zero", () => {
    expect(
      calculateDailyMarginMetrics({
        eggs_total_yield: 0,
        eggs_collected_for_sale: 0,
        daily_sold_eggs: 0,
        chicken_count: 0,
        revenue: 0,
        direct_cost: 10,
        allocated_cost: 5,
      }),
    ).toMatchObject({
      cost_per_collected_egg: null,
      margin_per_sold_egg: null,
      total_yield_per_chicken: null,
      sale_yield_per_chicken: null,
    });
  });
});

describe("rolling summaries", () => {
  const records = [
    {
      date: new Date("2026-03-01T00:00:00.000Z"),
      eggs_total_yield: 10,
      eggs_collected_for_sale: 8,
      eggs_sold: 5,
      revenue: 80,
      direct_cost: 20,
      allocated_cost: 5,
    },
    {
      date: new Date("2026-03-25T00:00:00.000Z"),
      eggs_total_yield: 12,
      eggs_collected_for_sale: 9,
      eggs_sold: 6,
      revenue: 96,
      direct_cost: 24,
      allocated_cost: 6,
    },
    {
      date: new Date("2026-03-29T00:00:00.000Z"),
      eggs_total_yield: 14,
      eggs_collected_for_sale: 12,
      eggs_sold: 7,
      revenue: 112,
      direct_cost: 28,
      allocated_cost: 7,
    },
    {
      date: new Date("2026-03-31T00:00:00.000Z"),
      eggs_total_yield: 16,
      eggs_collected_for_sale: 13,
      eggs_sold: 8,
      revenue: 128,
      direct_cost: 32,
      allocated_cost: 8,
    },
  ] as const;

  it("aggregates the last 7 days inclusively", () => {
    expect(
      calculateSevenDaySummary(records, new Date("2026-03-31T12:00:00.000Z")),
    ).toEqual({
      window_days: 7,
      start_date: new Date("2026-03-25T00:00:00.000Z"),
      end_date: new Date("2026-03-31T00:00:00.000Z"),
      eggs_total_yield: 42,
      eggs_collected_for_sale: 34,
      eggs_sold: 21,
      revenue: 336,
      direct_cost: 84,
      allocated_cost: 21,
      total_cost: 105,
      gross_margin: 231,
    });
  });

  it("aggregates the last 30 days inclusively", () => {
    expect(
      calculateThirtyDaySummary(records, new Date("2026-03-31T12:00:00.000Z")),
    ).toEqual({
      window_days: 30,
      start_date: new Date("2026-03-02T00:00:00.000Z"),
      end_date: new Date("2026-03-31T00:00:00.000Z"),
      eggs_total_yield: 42,
      eggs_collected_for_sale: 34,
      eggs_sold: 21,
      revenue: 336,
      direct_cost: 84,
      allocated_cost: 21,
      total_cost: 105,
      gross_margin: 231,
    });
  });
});
