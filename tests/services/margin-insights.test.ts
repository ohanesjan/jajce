import { Prisma, cost_category, cost_type, order_status, price_source } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getMarginInsights } from "@/lib/services/margin-insights";

describe("getMarginInsights", () => {
  it("calculates daily and rolling margin metrics from logs, costs, and completed orders", async () => {
    const database = createMarginInsightsTestDatabase();

    const insights = await getMarginInsights(
      {
        referenceDate: new Date("2026-04-10T12:00:00.000Z"),
        timeZone: "Europe/Amsterdam",
      },
      database as never,
    );

    expect(insights.daily).toMatchObject({
      eggs_total_yield: 42,
      eggs_collected_for_sale: 30,
      daily_sold_eggs: 12,
      chicken_count: 15,
      revenue: 48,
      direct_cost: 18,
      allocated_cost: 6,
      total_cost: 24,
      gross_margin: 24,
      direct_margin: 30,
      cost_per_collected_egg: 0.8,
      margin_per_sold_egg: 2,
    });

    expect(insights.summary_7d).toEqual({
      window_days: 7,
      start_date: new Date("2026-04-04T00:00:00.000Z"),
      end_date: new Date("2026-04-10T00:00:00.000Z"),
      eggs_total_yield: 82,
      eggs_collected_for_sale: 55,
      eggs_sold: 18,
      revenue: 72,
      direct_cost: 26,
      allocated_cost: 11,
      total_cost: 37,
      gross_margin: 35,
    });

    expect(insights.summary_30d).toEqual({
      window_days: 30,
      start_date: new Date("2026-03-12T00:00:00.000Z"),
      end_date: new Date("2026-04-10T00:00:00.000Z"),
      eggs_total_yield: 102,
      eggs_collected_for_sale: 70,
      eggs_sold: 22,
      revenue: 88,
      direct_cost: 33,
      allocated_cost: 15,
      total_cost: 48,
      gross_margin: 40,
    });
  });

  it("returns null per-unit metrics when the divisors are zero", async () => {
    const database = createMarginInsightsTestDatabase({
      dailyLogs: [],
      costEntries: [
        {
          id: "cost_entry_zero",
          date: new Date("2026-04-10T00:00:00.000Z"),
          category: cost_category.utilities,
          cost_type: cost_type.allocated,
          quantity: null,
          unit: null,
          unit_price: null,
          total_amount: new Prisma.Decimal("6.00"),
          source_type: "manual",
          cost_template_id: null,
          note: null,
          created_at: new Date("2026-04-10T09:00:00.000Z"),
          updated_at: new Date("2026-04-10T09:00:00.000Z"),
        },
      ],
      orders: [],
    });

    const insights = await getMarginInsights(
      {
        referenceDate: new Date("2026-04-10T12:00:00.000Z"),
        timeZone: "Europe/Amsterdam",
      },
      database as never,
    );

    expect(insights.daily).toMatchObject({
      cost_per_collected_egg: null,
      margin_per_sold_egg: null,
      total_yield_per_chicken: null,
      sale_yield_per_chicken: null,
    });
  });

  it("includes revenue recognized on the local start boundary of the rolling window", async () => {
    const database = createMarginInsightsTestDatabase({
      orders: [
        {
          id: "boundary_order",
          contact_id: "contact_boundary",
          date: new Date("2026-03-11T00:00:00.000Z"),
          target_fulfillment_date: null,
          quantity: 3,
          unit_price: new Prisma.Decimal("4.00"),
          total_price: new Prisma.Decimal("12.00"),
          status: order_status.completed,
          fulfilled_at: new Date("2026-03-11T23:30:00.000Z"),
          price_source: price_source.default,
          note: null,
          created_at: new Date("2026-03-11T23:30:00.000Z"),
          updated_at: new Date("2026-03-11T23:30:00.000Z"),
        },
      ],
    });

    const insights = await getMarginInsights(
      {
        referenceDate: new Date("2026-04-10T12:00:00.000Z"),
        timeZone: "Europe/Amsterdam",
      },
      database as never,
    );

    expect(insights.summary_30d.eggs_sold).toBe(3);
    expect(insights.summary_30d.revenue).toBe(12);
    expect(insights.summary_30d.gross_margin).toBe(-36);
  });
});

function createMarginInsightsTestDatabase(overrides?: {
  dailyLogs?: Array<{
    id: string;
    date: Date;
    eggs_total_yield: number;
    eggs_collected_for_sale: number;
    eggs_used_other_purpose: number;
    eggs_broken: number;
    eggs_unusable_other: number;
    chicken_count: number;
    public_note: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  }>;
  costEntries?: Array<{
    id: string;
    date: Date;
    category: cost_category;
    cost_type: cost_type;
    quantity: Prisma.Decimal | null;
    unit: string | null;
    unit_price: Prisma.Decimal | null;
    total_amount: Prisma.Decimal;
    source_type: "manual" | "template";
    cost_template_id: string | null;
    note: string | null;
    created_at: Date;
    updated_at: Date;
  }>;
  orders?: Array<{
    id: string;
    contact_id: string;
    date: Date;
    target_fulfillment_date: Date | null;
    quantity: number;
    unit_price: Prisma.Decimal;
    total_price: Prisma.Decimal;
    status: order_status;
    fulfilled_at: Date | null;
    price_source: price_source;
    note: string | null;
    created_at: Date;
    updated_at: Date;
  }>;
}) {
  const dailyLogs =
    overrides?.dailyLogs ??
    [
      {
        id: "daily_log_old",
        date: new Date("2026-03-20T00:00:00.000Z"),
        eggs_total_yield: 20,
        eggs_collected_for_sale: 15,
        eggs_used_other_purpose: 2,
        eggs_broken: 2,
        eggs_unusable_other: 1,
        chicken_count: 14,
        public_note: null,
        notes: null,
        created_at: new Date("2026-03-20T08:00:00.000Z"),
        updated_at: new Date("2026-03-20T08:00:00.000Z"),
      },
      {
        id: "daily_log_recent",
        date: new Date("2026-04-08T00:00:00.000Z"),
        eggs_total_yield: 40,
        eggs_collected_for_sale: 25,
        eggs_used_other_purpose: 5,
        eggs_broken: 5,
        eggs_unusable_other: 5,
        chicken_count: 15,
        public_note: null,
        notes: null,
        created_at: new Date("2026-04-08T08:00:00.000Z"),
        updated_at: new Date("2026-04-08T08:00:00.000Z"),
      },
      {
        id: "daily_log_today",
        date: new Date("2026-04-10T00:00:00.000Z"),
        eggs_total_yield: 42,
        eggs_collected_for_sale: 30,
        eggs_used_other_purpose: 4,
        eggs_broken: 4,
        eggs_unusable_other: 4,
        chicken_count: 15,
        public_note: null,
        notes: null,
        created_at: new Date("2026-04-10T08:00:00.000Z"),
        updated_at: new Date("2026-04-10T08:00:00.000Z"),
      },
    ];

  const costEntries =
    overrides?.costEntries ??
    [
      {
        id: "cost_entry_old_direct",
        date: new Date("2026-03-20T00:00:00.000Z"),
        category: cost_category.feed,
        cost_type: cost_type.direct,
        quantity: null,
        unit: null,
        unit_price: null,
        total_amount: new Prisma.Decimal("7.00"),
        source_type: "manual" as const,
        cost_template_id: null,
        note: null,
        created_at: new Date("2026-03-20T09:00:00.000Z"),
        updated_at: new Date("2026-03-20T09:00:00.000Z"),
      },
      {
        id: "cost_entry_old_allocated",
        date: new Date("2026-03-20T00:00:00.000Z"),
        category: cost_category.utilities,
        cost_type: cost_type.allocated,
        quantity: null,
        unit: null,
        unit_price: null,
        total_amount: new Prisma.Decimal("4.00"),
        source_type: "manual" as const,
        cost_template_id: null,
        note: null,
        created_at: new Date("2026-03-20T09:10:00.000Z"),
        updated_at: new Date("2026-03-20T09:10:00.000Z"),
      },
      {
        id: "cost_entry_recent_direct",
        date: new Date("2026-04-08T00:00:00.000Z"),
        category: cost_category.feed,
        cost_type: cost_type.direct,
        quantity: null,
        unit: null,
        unit_price: null,
        total_amount: new Prisma.Decimal("8.00"),
        source_type: "manual" as const,
        cost_template_id: null,
        note: null,
        created_at: new Date("2026-04-08T09:00:00.000Z"),
        updated_at: new Date("2026-04-08T09:00:00.000Z"),
      },
      {
        id: "cost_entry_recent_allocated",
        date: new Date("2026-04-08T00:00:00.000Z"),
        category: cost_category.utilities,
        cost_type: cost_type.allocated,
        quantity: null,
        unit: null,
        unit_price: null,
        total_amount: new Prisma.Decimal("5.00"),
        source_type: "manual" as const,
        cost_template_id: null,
        note: null,
        created_at: new Date("2026-04-08T09:10:00.000Z"),
        updated_at: new Date("2026-04-08T09:10:00.000Z"),
      },
      {
        id: "cost_entry_today_direct",
        date: new Date("2026-04-10T00:00:00.000Z"),
        category: cost_category.feed,
        cost_type: cost_type.direct,
        quantity: null,
        unit: null,
        unit_price: null,
        total_amount: new Prisma.Decimal("18.00"),
        source_type: "manual" as const,
        cost_template_id: null,
        note: null,
        created_at: new Date("2026-04-10T09:00:00.000Z"),
        updated_at: new Date("2026-04-10T09:00:00.000Z"),
      },
      {
        id: "cost_entry_today_allocated",
        date: new Date("2026-04-10T00:00:00.000Z"),
        category: cost_category.utilities,
        cost_type: cost_type.allocated,
        quantity: null,
        unit: null,
        unit_price: null,
        total_amount: new Prisma.Decimal("6.00"),
        source_type: "manual" as const,
        cost_template_id: null,
        note: null,
        created_at: new Date("2026-04-10T09:10:00.000Z"),
        updated_at: new Date("2026-04-10T09:10:00.000Z"),
      },
    ];

  const orders =
    overrides?.orders ??
    [
      {
        id: "order_old",
        contact_id: "contact_1",
        date: new Date("2026-03-20T00:00:00.000Z"),
        target_fulfillment_date: null,
        quantity: 4,
        unit_price: new Prisma.Decimal("4.00"),
        total_price: new Prisma.Decimal("16.00"),
        status: order_status.completed,
        fulfilled_at: null,
        price_source: price_source.default,
        note: null,
        created_at: new Date("2026-03-20T10:00:00.000Z"),
        updated_at: new Date("2026-03-20T10:00:00.000Z"),
      },
      {
        id: "order_recent",
        contact_id: "contact_2",
        date: new Date("2026-04-08T00:00:00.000Z"),
        target_fulfillment_date: null,
        quantity: 6,
        unit_price: new Prisma.Decimal("4.00"),
        total_price: new Prisma.Decimal("24.00"),
        status: order_status.completed,
        fulfilled_at: null,
        price_source: price_source.default,
        note: null,
        created_at: new Date("2026-04-08T10:00:00.000Z"),
        updated_at: new Date("2026-04-08T10:00:00.000Z"),
      },
      {
        id: "order_today",
        contact_id: "contact_3",
        date: new Date("2026-04-10T00:00:00.000Z"),
        target_fulfillment_date: null,
        quantity: 12,
        unit_price: new Prisma.Decimal("4.00"),
        total_price: new Prisma.Decimal("48.00"),
        status: order_status.completed,
        fulfilled_at: new Date("2026-04-10T09:30:00.000Z"),
        price_source: price_source.default,
        note: null,
        created_at: new Date("2026-04-10T09:30:00.000Z"),
        updated_at: new Date("2026-04-10T09:30:00.000Z"),
      },
    ];

  return {
    dailyLog: {
      findMany: async ({
        where,
      }: {
        where?: {
          date?: { gte?: Date; lte?: Date };
        };
      }) =>
        dailyLogs.filter((dailyLog) =>
          isDateWithinRange(dailyLog.date, where?.date),
        ),
    },
    costEntry: {
      findMany: async ({
        where,
      }: {
        where?: {
          date?: { gte?: Date; lte?: Date };
        };
      }) =>
        costEntries.filter((costEntry) =>
          isDateWithinRange(costEntry.date, where?.date),
        ),
    },
    order: {
      findMany: async ({
        where,
      }: {
        where?: {
          status?: order_status;
          OR?: Array<
            | { fulfilled_at: { gte?: Date; lt?: Date } }
            | { fulfilled_at: null; date: { gte?: Date; lte?: Date } }
          >;
        };
      }) =>
        orders.filter((order) => {
          if (where?.status && order.status !== where.status) {
            return false;
          }

          if (where?.OR) {
            return where.OR.some((condition) => {
              if (condition.fulfilled_at === null) {
                return (
                  order.fulfilled_at === null &&
                  isDateWithinRange(order.date, condition.date)
                );
              }

              if (!order.fulfilled_at) {
                return false;
              }

              return isTimestampWithinRange(order.fulfilled_at, condition.fulfilled_at);
            });
          }

          return true;
        }),
    },
  };
}

function isDateWithinRange(
  value: Date,
  range?: { gte?: Date; lte?: Date },
): boolean {
  if (!range) {
    return true;
  }

  if (range.gte && value.getTime() < range.gte.getTime()) {
    return false;
  }

  if (range.lte && value.getTime() > range.lte.getTime()) {
    return false;
  }

  return true;
}

function isTimestampWithinRange(
  value: Date,
  range: { gte?: Date; lt?: Date },
): boolean {
  if (range.gte && value.getTime() < range.gte.getTime()) {
    return false;
  }

  if (range.lt && value.getTime() >= range.lt.getTime()) {
    return false;
  }

  return true;
}
