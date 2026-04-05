import "dotenv/config";
import { beforeAll, beforeEach, afterAll, afterEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createDailyLog, updateDailyLog } from "@/lib/services/daily-logs";
import { formatDateOnly } from "@/lib/utils/date";

const describeWithDatabase =
  process.env.DATABASE_URL && process.env.RUN_DB_TESTS === "1"
    ? describe
    : describe.skip;
const TEST_DATES = ["2099-12-30", "2099-12-31"] as const;

describeWithDatabase("daily log reconciliation integration", () => {
  const db = getDb();

  beforeAll(async () => {
    await cleanupIntegrationRows();
  });

  beforeEach(async () => {
    await cleanupIntegrationRows();
  });

  afterEach(async () => {
    await cleanupIntegrationRows();
  });

  afterAll(async () => {
    await cleanupIntegrationRows();
    await db.$disconnect();
    globalThis.__prisma__ = undefined;
  });

  it("creates and updates a single collected inventory row in Postgres", async () => {
    const createdDailyLog = await createDailyLog({
      date: TEST_DATES[0],
      eggs_collected_for_sale: 28,
      eggs_used_other_purpose: 2,
      eggs_broken: 1,
      eggs_unusable_other: 0,
      chicken_count: 52,
    });

    const createdTransactions = await db.inventoryTransaction.findMany({
      where: {
        daily_log_id: createdDailyLog.id,
        type: "collected",
      },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
    });

    expect(createdTransactions).toHaveLength(1);
    expect(createdTransactions[0]?.id).toBeTruthy();
    expect(createdTransactions[0]?.quantity).toBe(28);
    expect(formatDateOnly(createdTransactions[0]!.date)).toBe(TEST_DATES[0]);

    await updateDailyLog(createdDailyLog.id, {
      date: TEST_DATES[0],
      eggs_collected_for_sale: 35,
      eggs_used_other_purpose: 3,
      eggs_broken: 1,
      eggs_unusable_other: 1,
      chicken_count: 53,
    });

    const updatedTransactions = await db.inventoryTransaction.findMany({
      where: {
        daily_log_id: createdDailyLog.id,
        type: "collected",
      },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
    });

    expect(updatedTransactions).toHaveLength(1);
    expect(updatedTransactions[0]?.id).toBe(createdTransactions[0]?.id);
    expect(updatedTransactions[0]?.quantity).toBe(35);
    expect(formatDateOnly(updatedTransactions[0]!.date)).toBe(TEST_DATES[0]);
  });
});

async function cleanupIntegrationRows() {
  const db = getDb();
  const dailyLogs = await db.dailyLog.findMany({
    where: {
      date: {
        in: TEST_DATES.map((value) => new Date(`${value}T00:00:00.000Z`)),
      },
    },
    select: { id: true },
  });
  const dailyLogIds = dailyLogs.map((dailyLog) => dailyLog.id);

  if (dailyLogIds.length > 0) {
    await db.inventoryTransaction.deleteMany({
      where: {
        daily_log_id: {
          in: dailyLogIds,
        },
      },
    });
  }

  await db.dailyLog.deleteMany({
    where: {
      id: {
        in: dailyLogIds,
      },
    },
  });
}
