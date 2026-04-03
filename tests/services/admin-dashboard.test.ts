import {
  Prisma,
  cost_category,
  cost_type,
  order_status,
  price_source,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getAdminDashboardData } from "@/lib/services/admin-dashboard";
import { formatDateOnly } from "@/lib/utils/date";

describe("getAdminDashboardData", () => {
  it("returns the simple dashboard payload with local-date-safe KPIs", async () => {
    const database = createAdminDashboardTestDatabase();

    const dashboard = await getAdminDashboardData(
      {
        mode: "simple",
        referenceDate: new Date("2026-04-10T12:00:00.000Z"),
        timeZone: "Europe/Amsterdam",
      },
      database as never,
    );

    expect(formatDateOnly(dashboard.date)).toBe("2026-04-10");
    expect(dashboard.mode).toBe("simple");
    expect(dashboard.expanded).toBeNull();
    expect(dashboard.simple).toEqual({
      available_eggs: 34,
      today_total_yield: 42,
      today_collected_for_sale: 30,
      yesterday_collected_for_sale: null,
      latest_chicken_count: 16,
      latest_chicken_count_date: new Date("2026-04-10T00:00:00.000Z"),
      today_sold_eggs: 10,
      today_revenue: 40,
      today_total_cost: 26,
      today_gross_margin: 14,
      subscriber_count: 2,
      waiting_list_count: 2,
      active_customer_count: 3,
    });
  });

  it("returns expanded metrics including per-chicken values, rolling margins, and today's cost by category", async () => {
    const database = createAdminDashboardTestDatabase();

    const dashboard = await getAdminDashboardData(
      {
        mode: "expanded",
        referenceDate: new Date("2026-04-10T12:00:00.000Z"),
        timeZone: "Europe/Amsterdam",
      },
      database as never,
    );

    expect(dashboard.mode).toBe("expanded");
    expect(dashboard.expanded).toEqual({
      total_yield_per_chicken: 2.625,
      sale_yield_per_chicken: 1.875,
      today_direct_cost: 20,
      today_allocated_cost: 6,
      gross_margin_7d: 37,
      gross_margin_30d: 38,
      cost_by_category: [
        {
          category: cost_category.feed,
          total_amount: 18,
        },
        {
          category: cost_category.packaging,
          total_amount: 2,
        },
        {
          category: cost_category.utilities,
          total_amount: 6,
        },
      ],
    });
  });

  it("uses the most recent daily log for chicken count and keeps missing daily-log metrics null", async () => {
    const database = createAdminDashboardTestDatabase({
      dailyLogs: [
        buildDailyLog({
          id: "daily_log_latest",
          date: "2026-04-09",
          eggs_total_yield: 18,
          eggs_collected_for_sale: 12,
          chicken_count: 11,
        }),
      ],
      costEntries: [],
      orders: [],
      inventoryTransactions: [],
      contacts: [],
    });

    const dashboard = await getAdminDashboardData(
      {
        mode: "simple",
        referenceDate: new Date("2026-04-10T12:00:00.000Z"),
        timeZone: "Europe/Amsterdam",
      },
      database as never,
    );

    expect(dashboard.simple.today_total_yield).toBeNull();
    expect(dashboard.simple.today_collected_for_sale).toBeNull();
    expect(dashboard.simple.yesterday_collected_for_sale).toBe(12);
    expect(dashboard.simple.latest_chicken_count).toBe(11);
    expect(dashboard.simple.latest_chicken_count_date).toEqual(
      new Date("2026-04-09T00:00:00.000Z"),
    );
  });

  it("falls back to simple mode and returns safe empty states", async () => {
    const dashboard = await getAdminDashboardData(
      {
        mode: "unexpected-mode",
        referenceDate: new Date("2026-04-10T12:00:00.000Z"),
        timeZone: "Europe/Amsterdam",
      },
      createAdminDashboardTestDatabase({
        dailyLogs: [],
        costEntries: [],
        orders: [],
        inventoryTransactions: [],
        contacts: [],
      }) as never,
    );

    expect(dashboard.mode).toBe("simple");
    expect(dashboard.expanded).toBeNull();
    expect(dashboard.simple).toEqual({
      available_eggs: 0,
      today_total_yield: null,
      today_collected_for_sale: null,
      yesterday_collected_for_sale: null,
      latest_chicken_count: null,
      latest_chicken_count_date: null,
      today_sold_eggs: 0,
      today_revenue: 0,
      today_total_cost: 0,
      today_gross_margin: 0,
      subscriber_count: 0,
      waiting_list_count: 0,
      active_customer_count: 0,
    });
  });
});

function createAdminDashboardTestDatabase(overrides?: {
  dailyLogs?: Array<ReturnType<typeof buildDailyLog>>;
  costEntries?: Array<ReturnType<typeof buildCostEntry>>;
  orders?: Array<ReturnType<typeof buildOrder>>;
  inventoryTransactions?: Array<ReturnType<typeof buildInventoryTransaction>>;
  contacts?: Array<{
    id: string;
    is_subscriber: boolean;
    is_waiting_list: boolean;
    is_active_customer: boolean;
  }>;
}) {
  const dailyLogs =
    overrides?.dailyLogs ??
    [
      buildDailyLog({
        id: "daily_log_old",
        date: "2026-03-20",
        eggs_total_yield: 20,
        eggs_collected_for_sale: 15,
        chicken_count: 14,
      }),
      buildDailyLog({
        id: "daily_log_recent",
        date: "2026-04-08",
        eggs_total_yield: 40,
        eggs_collected_for_sale: 25,
        chicken_count: 15,
      }),
      buildDailyLog({
        id: "daily_log_today",
        date: "2026-04-10",
        eggs_total_yield: 42,
        eggs_collected_for_sale: 30,
        chicken_count: 16,
      }),
    ];
  const costEntries =
    overrides?.costEntries ??
    [
      buildCostEntry({
        id: "cost_old_direct",
        date: "2026-03-20",
        category: cost_category.feed,
        cost_type: cost_type.direct,
        total_amount: "7.00",
      }),
      buildCostEntry({
        id: "cost_old_allocated",
        date: "2026-03-20",
        category: cost_category.utilities,
        cost_type: cost_type.allocated,
        total_amount: "4.00",
      }),
      buildCostEntry({
        id: "cost_recent_direct",
        date: "2026-04-08",
        category: cost_category.feed,
        cost_type: cost_type.direct,
        total_amount: "8.00",
      }),
      buildCostEntry({
        id: "cost_recent_allocated",
        date: "2026-04-08",
        category: cost_category.maintenance,
        cost_type: cost_type.allocated,
        total_amount: "1.00",
      }),
      buildCostEntry({
        id: "cost_today_direct",
        date: "2026-04-10",
        category: cost_category.feed,
        cost_type: cost_type.direct,
        total_amount: "18.00",
      }),
      buildCostEntry({
        id: "cost_today_allocated",
        date: "2026-04-10",
        category: cost_category.utilities,
        cost_type: cost_type.allocated,
        total_amount: "6.00",
      }),
      buildCostEntry({
        id: "cost_today_packaging",
        date: "2026-04-10",
        category: cost_category.packaging,
        cost_type: cost_type.direct,
        total_amount: "2.00",
      }),
    ];
  const orders =
    overrides?.orders ??
    [
      buildOrder({
        id: "order_boundary_30d",
        date: "2026-03-11",
        quantity: 3,
        total_price: "12.00",
        fulfilled_at: new Date("2026-03-11T23:30:00.000Z"),
      }),
      buildOrder({
        id: "order_recent",
        date: "2026-04-08",
        quantity: 8,
        total_price: "32.00",
        fulfilled_at: null,
      }),
      buildOrder({
        id: "order_today_local_boundary",
        date: "2026-04-09",
        quantity: 10,
        total_price: "40.00",
        fulfilled_at: new Date("2026-04-09T22:30:00.000Z"),
      }),
    ];
  const inventoryTransactions =
    overrides?.inventoryTransactions ??
    [
      buildInventoryTransaction({
        id: "inventory_collected",
        type: "collected",
        quantity: 50,
      }),
      buildInventoryTransaction({
        id: "inventory_reserved",
        type: "reserved",
        quantity: 5,
      }),
      buildInventoryTransaction({
        id: "inventory_sold",
        type: "sold",
        quantity: 10,
      }),
      buildInventoryTransaction({
        id: "inventory_released",
        type: "released",
        quantity: 2,
      }),
      buildInventoryTransaction({
        id: "inventory_adjustment",
        type: "manual_adjustment",
        quantity: -3,
      }),
    ];
  const contacts =
    overrides?.contacts ??
    [
      {
        id: "contact_1",
        is_subscriber: true,
        is_waiting_list: true,
        is_active_customer: true,
      },
      {
        id: "contact_2",
        is_subscriber: true,
        is_waiting_list: false,
        is_active_customer: true,
      },
      {
        id: "contact_3",
        is_subscriber: false,
        is_waiting_list: true,
        is_active_customer: false,
      },
      {
        id: "contact_4",
        is_subscriber: false,
        is_waiting_list: false,
        is_active_customer: true,
      },
    ];

  return {
    dailyLog: {
      findUnique: async ({
        where,
      }: {
        where: { date: Date };
      }) =>
        dailyLogs.find(
          (dailyLog) => formatDateOnly(dailyLog.date) === formatDateOnly(where.date),
        ) ?? null,
      findFirst: async () =>
        [...dailyLogs].sort(
          (left, right) =>
            right.date.getTime() - left.date.getTime() ||
            right.created_at.getTime() - left.created_at.getTime(),
        )[0] ?? null,
      findMany: async () => [...dailyLogs],
    },
    inventoryTransaction: {
      findMany: async () => inventoryTransactions,
    },
    contact: {
      count: async ({
        where,
      }: {
        where: Partial<{
          is_subscriber: boolean;
          is_waiting_list: boolean;
          is_active_customer: boolean;
        }>;
      }) =>
        contacts.filter((contact) =>
          Object.entries(where).every(
            ([key, value]) => contact[key as keyof typeof contact] === value,
          ),
        ).length,
    },
    costEntry: {
      findMany: async ({
        where,
      }: {
        where?: {
          date?: Date | { gte: Date; lte: Date };
        };
      }) => {
        if (where?.date instanceof Date) {
          return costEntries.filter(
            (costEntry) =>
              formatDateOnly(costEntry.date) === formatDateOnly(where.date as Date),
          );
        }

        return [...costEntries];
      },
    },
    order: {
      findMany: async () =>
        orders
          .filter((order) => order.status === order_status.completed)
          .sort(
            (left, right) =>
              (left.fulfilled_at ?? left.date).getTime() -
                (right.fulfilled_at ?? right.date).getTime() ||
              left.created_at.getTime() - right.created_at.getTime(),
          ),
    },
  };
}

function buildDailyLog({
  id,
  date,
  eggs_total_yield,
  eggs_collected_for_sale,
  chicken_count,
}: {
  id: string;
  date: string;
  eggs_total_yield: number;
  eggs_collected_for_sale: number;
  chicken_count: number;
}) {
  return {
    id,
    date: new Date(`${date}T00:00:00.000Z`),
    eggs_total_yield,
    eggs_collected_for_sale,
    eggs_used_other_purpose: 0,
    eggs_broken: 0,
    eggs_unusable_other: 0,
    chicken_count,
    public_note: null,
    notes: null,
    created_at: new Date(`${date}T08:00:00.000Z`),
    updated_at: new Date(`${date}T08:00:00.000Z`),
  };
}

function buildCostEntry({
  id,
  date,
  category,
  cost_type,
  total_amount,
}: {
  id: string;
  date: string;
  category: cost_category;
  cost_type: cost_type;
  total_amount: string;
}) {
  return {
    id,
    date: new Date(`${date}T00:00:00.000Z`),
    category,
    cost_type,
    quantity: null,
    unit: null,
    unit_price: null,
    total_amount: new Prisma.Decimal(total_amount),
    source_type: "manual" as const,
    cost_template_id: null,
    note: null,
    created_at: new Date(`${date}T09:00:00.000Z`),
    updated_at: new Date(`${date}T09:00:00.000Z`),
  };
}

function buildOrder({
  id,
  date,
  quantity,
  total_price,
  fulfilled_at,
}: {
  id: string;
  date: string;
  quantity: number;
  total_price: string;
  fulfilled_at: Date | null;
}) {
  return {
    id,
    contact_id: "contact_1",
    date: new Date(`${date}T00:00:00.000Z`),
    target_fulfillment_date: null,
    quantity,
    unit_price: new Prisma.Decimal("4.00"),
    total_price: new Prisma.Decimal(total_price),
    status: order_status.completed,
    fulfilled_at,
    price_source: price_source.default,
    note: null,
    created_at: new Date(`${date}T10:00:00.000Z`),
    updated_at: new Date(`${date}T10:00:00.000Z`),
  };
}

function buildInventoryTransaction({
  id,
  type,
  quantity,
}: {
  id: string;
  type:
    | "collected"
    | "reserved"
    | "released"
    | "sold"
    | "manual_adjustment";
  quantity: number;
}) {
  return {
    id,
    date: new Date("2026-04-10T00:00:00.000Z"),
    type,
    quantity,
    daily_log_id: null,
    order_id: null,
    note: null,
    created_at: new Date("2026-04-10T12:00:00.000Z"),
  };
}
