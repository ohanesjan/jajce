import type { DailyLog, PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { calculateAvailableInventory } from "@/lib/domain/inventory";
import {
  addUtcDays,
  getDateOnlyInTimeZone,
  parseDateOnly,
} from "@/lib/utils/date";

const ADMIN_DASHBOARD_TIME_ZONE =
  process.env.ADMIN_DASHBOARD_TIME_ZONE ?? "Europe/Amsterdam";

export type AdminDashboardMetrics = {
  available_eggs: number;
  today_total_yield: number;
  today_collected_for_sale: number;
  yesterday_collected_for_sale: number;
  latest_chicken_count: number;
  latest_chicken_count_date: Date | null;
};

type DashboardDb = Pick<PrismaClient, "dailyLog" | "inventoryTransaction">;

export async function getAdminDashboardMetrics(
  {
    referenceDate = new Date(),
    timeZone = ADMIN_DASHBOARD_TIME_ZONE,
  }: {
    referenceDate?: Date;
    timeZone?: string;
  } = {},
  database: DashboardDb = getDb(),
): Promise<AdminDashboardMetrics> {
  const todayDate = parseDateOnly(getDateOnlyInTimeZone(referenceDate, timeZone));
  const yesterdayDate = addUtcDays(todayDate, -1);

  const [todayLog, yesterdayLog, latestDailyLog, transactions] =
    await Promise.all([
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
    ]);

  return {
    available_eggs: calculateAvailableInventory(transactions),
    today_total_yield: todayLog?.eggs_total_yield ?? 0,
    today_collected_for_sale: todayLog?.eggs_collected_for_sale ?? 0,
    yesterday_collected_for_sale: yesterdayLog?.eggs_collected_for_sale ?? 0,
    latest_chicken_count: getLatestChickenCount(latestDailyLog),
    latest_chicken_count_date: latestDailyLog?.date ?? null,
  };
}

function getLatestChickenCount(dailyLog: DailyLog | null): number {
  return dailyLog?.chicken_count ?? 0;
}
