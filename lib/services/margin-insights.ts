import { Prisma, PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import {
  DailyMarginMetrics,
  RollingSummary,
  RollingSummaryRecord,
  calculateDailyMarginMetrics,
  calculateSevenDaySummary,
  calculateThirtyDaySummary,
} from "@/lib/domain/margin";
import { getRevenueRecognitionDate } from "@/lib/domain/revenue";
import {
  addUtcDays,
  formatDateOnly,
  getDateOnlyInTimeZone,
  parseDateOnly,
} from "@/lib/utils/date";

const ADMIN_MARGIN_TIME_ZONE =
  process.env.ADMIN_DASHBOARD_TIME_ZONE ?? "Europe/Amsterdam";

export type MarginInsights = {
  date: Date;
  daily: DailyMarginMetrics;
  summary_7d: RollingSummary;
  summary_30d: RollingSummary;
};

type MarginInsightsDb = Pick<
  PrismaClient,
  "dailyLog" | "costEntry" | "order"
>;

type AggregatedMarginRecord = RollingSummaryRecord & {
  chicken_count: number;
};

type RevenueRecognitionOrderRecord = Awaited<
  ReturnType<MarginInsightsDb["order"]["findMany"]>
>[number];

export async function getMarginInsights(
  {
    referenceDate = new Date(),
    timeZone = ADMIN_MARGIN_TIME_ZONE,
  }: {
    referenceDate?: Date;
    timeZone?: string;
  } = {},
  database: MarginInsightsDb = getDb(),
): Promise<MarginInsights> {
  const date = parseDateOnly(getDateOnlyInTimeZone(referenceDate, timeZone));
  const rollingStartDate = addUtcDays(date, -29);
  const nextDate = addUtcDays(date, 1);
  const rollingStartLabel = formatDateOnly(rollingStartDate);
  const dateLabel = formatDateOnly(date);
  const orderQueryStart = addUtcDays(rollingStartDate, -1);
  const orderQueryEndExclusive = addUtcDays(nextDate, 1);

  const [dailyLogs, costEntries, completedOrders] = await Promise.all([
    database.dailyLog.findMany({
      where: {
        date: {
          gte: rollingStartDate,
          lte: date,
        },
      },
      orderBy: { date: "asc" },
    }),
    database.costEntry.findMany({
      where: {
        date: {
          gte: rollingStartDate,
          lte: date,
        },
      },
      orderBy: { date: "asc" },
    }),
    database.order.findMany({
      where: {
        status: "completed",
        OR: [
          {
            fulfilled_at: {
              gte: orderQueryStart,
              lt: orderQueryEndExclusive,
            },
          },
          {
            fulfilled_at: null,
            date: {
              gte: rollingStartDate,
              lte: date,
            },
          },
        ],
      },
      orderBy: [{ fulfilled_at: "asc" }, { date: "asc" }, { created_at: "asc" }],
    }),
  ]);

  const recordsByDate = new Map<string, AggregatedMarginRecord>();

  for (const dailyLog of dailyLogs) {
    const dateKey = formatDateOnly(dailyLog.date);
    const record = getOrCreateAggregatedRecord(recordsByDate, dailyLog.date);

    recordsByDate.set(dateKey, {
      ...record,
      eggs_total_yield: dailyLog.eggs_total_yield,
      eggs_collected_for_sale: dailyLog.eggs_collected_for_sale,
      chicken_count: dailyLog.chicken_count,
    });
  }

  for (const costEntry of costEntries) {
    const record = getOrCreateAggregatedRecord(recordsByDate, costEntry.date);

    if (costEntry.cost_type === "direct") {
      record.direct_cost += decimalToNumber(costEntry.total_amount);
    } else {
      record.allocated_cost += decimalToNumber(costEntry.total_amount);
    }
  }

  for (const order of completedOrders) {
    const revenueDateLabel = getRevenueRecognitionDateLabel(order, timeZone);

    if (
      revenueDateLabel < rollingStartLabel ||
      revenueDateLabel > dateLabel
    ) {
      continue;
    }

    const revenueDate = parseDateOnly(revenueDateLabel);
    const record = getOrCreateAggregatedRecord(recordsByDate, revenueDate);

    record.eggs_sold += order.quantity;
    record.revenue += decimalToNumber(order.total_price);
  }

  const rollingRecords = Array.from(recordsByDate.values()).sort(
    (left, right) => left.date.getTime() - right.date.getTime(),
  );
  const dailyRecord =
    recordsByDate.get(formatDateOnly(date)) ?? createEmptyAggregatedRecord(date);

  return {
    date,
    daily: calculateDailyMarginMetrics({
      eggs_total_yield: dailyRecord.eggs_total_yield,
      eggs_collected_for_sale: dailyRecord.eggs_collected_for_sale,
      daily_sold_eggs: dailyRecord.eggs_sold,
      chicken_count: dailyRecord.chicken_count,
      revenue: dailyRecord.revenue,
      direct_cost: dailyRecord.direct_cost,
      allocated_cost: dailyRecord.allocated_cost,
    }),
    summary_7d: calculateSevenDaySummary(rollingRecords, date),
    summary_30d: calculateThirtyDaySummary(rollingRecords, date),
  };
}

function getOrCreateAggregatedRecord(
  recordsByDate: Map<string, AggregatedMarginRecord>,
  date: Date,
): AggregatedMarginRecord {
  const dateKey = formatDateOnly(date);
  const existingRecord = recordsByDate.get(dateKey);

  if (existingRecord) {
    return existingRecord;
  }

  const record = createEmptyAggregatedRecord(date);
  recordsByDate.set(dateKey, record);

  return record;
}

function createEmptyAggregatedRecord(date: Date): AggregatedMarginRecord {
  return {
    date: parseDateOnly(formatDateOnly(date)),
    eggs_total_yield: 0,
    eggs_collected_for_sale: 0,
    eggs_sold: 0,
    revenue: 0,
    direct_cost: 0,
    allocated_cost: 0,
    chicken_count: 0,
  };
}

function decimalToNumber(value: Prisma.Decimal | number): number {
  return value instanceof Prisma.Decimal ? value.toNumber() : value;
}

function getRevenueRecognitionDateLabel(
  order: RevenueRecognitionOrderRecord,
  timeZone: string,
): string {
  return getDateOnlyInTimeZone(getRevenueRecognitionDate(order), timeZone);
}
