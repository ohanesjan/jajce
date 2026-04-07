import { Prisma, PrismaClient, cost_category } from "@prisma/client";
import { getDb } from "@/lib/db";
import { calculateDailyMarginMetrics } from "@/lib/domain/margin";
import { calculateAvailableInventory } from "@/lib/domain/inventory";
import { getMarginInsights } from "@/lib/services/margin-insights";
import {
  addUtcDays,
  getDateOnlyInTimeZone,
  parseDateOnly,
} from "@/lib/utils/date";

const ADMIN_DASHBOARD_TIME_ZONE =
  process.env.ADMIN_DASHBOARD_TIME_ZONE ?? "Europe/Amsterdam";

export const ADMIN_DASHBOARD_MODES = ["simple", "expanded"] as const;

export type AdminDashboardMode = (typeof ADMIN_DASHBOARD_MODES)[number];

export type AdminDashboardSimpleMetrics = {
  available_eggs: number;
  today_total_yield: number | null;
  today_collected_for_sale: number | null;
  yesterday_collected_for_sale: number | null;
  latest_chicken_count: number | null;
  latest_chicken_count_date: Date | null;
  today_sold_eggs: number;
  today_revenue: number;
  today_total_cost: number;
  today_gross_margin: number;
  subscriber_count: number;
  waiting_list_count: number;
  active_customer_count: number;
};

export type AdminDashboardCostByCategory = {
  category: cost_category;
  total_amount: number;
};

export type AdminDashboardExpandedMetrics = {
  total_yield_per_chicken: number | null;
  sale_yield_per_chicken: number | null;
  today_direct_cost: number;
  today_allocated_cost: number;
  gross_margin_7d: number;
  gross_margin_30d: number;
  cost_by_category: AdminDashboardCostByCategory[];
};

export type AdminDashboardPayload = {
  mode: AdminDashboardMode;
  date: Date;
  simple: AdminDashboardSimpleMetrics;
  expanded: AdminDashboardExpandedMetrics | null;
};

type DashboardDb = Pick<
  PrismaClient,
  "contact" | "costEntry" | "dailyLog" | "inventoryTransaction" | "order"
>;

type DashboardDailyLog = Awaited<
  ReturnType<DashboardDb["dailyLog"]["findFirst"]>
>;

export async function getAdminDashboardData(
  {
    mode = "simple",
    referenceDate = new Date(),
    timeZone = ADMIN_DASHBOARD_TIME_ZONE,
  }: {
    mode?: unknown;
    referenceDate?: Date;
    timeZone?: string;
  } = {},
  database: DashboardDb = getDb(),
): Promise<AdminDashboardPayload> {
  const resolvedMode = parseAdminDashboardMode(mode);
  const todayDate = parseDateOnly(getDateOnlyInTimeZone(referenceDate, timeZone));
  const yesterdayDate = addUtcDays(todayDate, -1);

  const [
    todayLog,
    yesterdayLog,
    latestDailyLog,
    inventoryTransactions,
    subscriberCount,
    waitingListCount,
    activeCustomerCount,
    marginInsights,
    todayCostEntries,
  ] = await Promise.all([
    database.dailyLog.findUnique({
      where: { date: todayDate },
    }),
    database.dailyLog.findUnique({
      where: { date: yesterdayDate },
    }),
    database.dailyLog.findFirst({
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
    }),
    database.inventoryTransaction.findMany({
      select: {
        type: true,
        quantity: true,
      },
    }),
    database.contact.count({
      where: {
        is_subscriber: true,
      },
    }),
    database.contact.count({
      where: {
        is_waiting_list: true,
      },
    }),
    database.contact.count({
      where: {
        is_active_customer: true,
      },
    }),
    getMarginInsights(
      {
        referenceDate,
        timeZone,
      },
      database,
    ),
    database.costEntry.findMany({
      where: {
        date: todayDate,
      },
      select: {
        category: true,
        total_amount: true,
      },
      orderBy: [{ category: "asc" }, { created_at: "asc" }],
    }),
  ]);

  const todayProductivityMetrics = todayLog
    ? calculateDailyMarginMetrics({
        eggs_total_yield: todayLog.eggs_total_yield,
        eggs_collected_for_sale: todayLog.eggs_collected_for_sale,
        daily_sold_eggs: 0,
        chicken_count: todayLog.chicken_count,
        revenue: 0,
        direct_cost: 0,
        allocated_cost: 0,
      })
    : null;

  return {
    mode: resolvedMode,
    date: todayDate,
    simple: {
      available_eggs: calculateAvailableInventory(inventoryTransactions),
      today_total_yield: todayLog?.eggs_total_yield ?? null,
      today_collected_for_sale: todayLog?.eggs_collected_for_sale ?? null,
      yesterday_collected_for_sale:
        yesterdayLog?.eggs_collected_for_sale ?? null,
      latest_chicken_count: latestDailyLog?.chicken_count ?? null,
      latest_chicken_count_date: getLatestChickenCountDate(latestDailyLog),
      today_sold_eggs: marginInsights.daily.daily_sold_eggs,
      today_revenue: marginInsights.daily.revenue,
      today_total_cost: marginInsights.daily.total_cost,
      today_gross_margin: marginInsights.daily.gross_margin,
      subscriber_count: subscriberCount,
      waiting_list_count: waitingListCount,
      active_customer_count: activeCustomerCount,
    },
    expanded:
      resolvedMode === "expanded"
        ? {
            total_yield_per_chicken:
              todayProductivityMetrics?.total_yield_per_chicken ?? null,
            sale_yield_per_chicken:
              todayProductivityMetrics?.sale_yield_per_chicken ?? null,
            today_direct_cost: marginInsights.daily.direct_cost,
            today_allocated_cost: marginInsights.daily.allocated_cost,
            gross_margin_7d: marginInsights.summary_7d.gross_margin,
            gross_margin_30d: marginInsights.summary_30d.gross_margin,
            cost_by_category: aggregateCostByCategory(todayCostEntries),
          }
        : null,
  };
}

function parseAdminDashboardMode(value: unknown): AdminDashboardMode {
  return value === "expanded" ? "expanded" : "simple";
}

function aggregateCostByCategory(
  costEntries: ReadonlyArray<{
    category: cost_category;
    total_amount: Prisma.Decimal | number;
  }>,
): AdminDashboardCostByCategory[] {
  const totalsByCategory = new Map<cost_category, number>();

  for (const costEntry of costEntries) {
    const nextTotal =
      (totalsByCategory.get(costEntry.category) ?? 0) +
      decimalToNumber(costEntry.total_amount);

    totalsByCategory.set(costEntry.category, nextTotal);
  }

  return Array.from(totalsByCategory.entries())
    .map(([category, total_amount]) => ({
      category,
      total_amount,
    }))
    .sort((left, right) => left.category.localeCompare(right.category));
}

function getLatestChickenCountDate(dailyLog: DashboardDailyLog): Date | null {
  return dailyLog?.date ?? null;
}

function decimalToNumber(value: Prisma.Decimal | number): number {
  return value instanceof Prisma.Decimal ? value.toNumber() : value;
}
