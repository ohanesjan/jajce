import { describe, expect, it } from "vitest";
import {
  createDailyLog,
  DailyLogDateConflictError,
  DailyLogValidationError,
  deleteDailyLog,
  reconcileCollectedInventoryTransaction,
  updateDailyLog,
  validateDailyLogInput,
} from "@/lib/services/daily-logs";
import { formatDateOnly } from "@/lib/utils/date";

describe("validateDailyLogInput", () => {
  it("always recalculates total yield from the four source fields", () => {
    const validatedInput = validateDailyLogInput({
      date: "2026-04-01",
      eggs_total_yield: 999,
      eggs_collected_for_sale: "40",
      eggs_used_other_purpose: "3",
      eggs_broken: "2",
      eggs_unusable_other: "1",
      chicken_count: "55",
      public_note: "  Fresh today  ",
      notes: "  Internal note  ",
    });

    expect(validatedInput).toMatchObject({
      eggs_total_yield: 46,
      eggs_collected_for_sale: 40,
      eggs_used_other_purpose: 3,
      eggs_broken: 2,
      eggs_unusable_other: 1,
      chicken_count: 55,
      public_note: "Fresh today",
      notes: "Internal note",
    });
    expect(formatDateOnly(validatedInput.date)).toBe("2026-04-01");
  });
});

describe("daily log inventory reconciliation", () => {
  it("creates one collected inventory row from eggs_collected_for_sale", async () => {
    const database = createDailyLogTestDatabase();

    const dailyLog = await createDailyLog(
      {
        date: "2026-04-01",
        eggs_collected_for_sale: 28,
        eggs_used_other_purpose: 2,
        eggs_broken: 1,
        eggs_unusable_other: 0,
        chicken_count: 52,
      },
      database as never,
    );

    expect(database.transactionCount).toBe(1);
    expect(dailyLog.eggs_total_yield).toBe(31);
    expect(database.inventoryTransactions).toHaveLength(1);
    expect(database.inventoryTransactions[0]).toMatchObject({
      daily_log_id: dailyLog.id,
      type: "collected",
      quantity: 28,
    });
  });

  it("reconciles updates instead of appending duplicate collected rows", async () => {
    const database = createDailyLogTestDatabase();
    const dailyLog = await createDailyLog(
      {
        date: "2026-04-01",
        eggs_collected_for_sale: 20,
        eggs_used_other_purpose: 1,
        eggs_broken: 1,
        eggs_unusable_other: 0,
        chicken_count: 40,
      },
      database as never,
    );

    await updateDailyLog(
      dailyLog.id,
      {
        date: "2026-04-01",
        eggs_collected_for_sale: 35,
        eggs_used_other_purpose: 2,
        eggs_broken: 0,
        eggs_unusable_other: 1,
        chicken_count: 41,
      },
      database as never,
    );

    expect(database.transactionCount).toBe(2);
    expect(database.inventoryTransactions).toHaveLength(1);
    expect(database.inventoryTransactions[0]).toMatchObject({
      daily_log_id: dailyLog.id,
      type: "collected",
      quantity: 35,
    });
  });

  it("raises a date conflict when a second daily log uses the same date", async () => {
    const database = createDailyLogTestDatabase();

    await createDailyLog(
      {
        date: "2026-04-01",
        eggs_collected_for_sale: 20,
        eggs_used_other_purpose: 0,
        eggs_broken: 0,
        eggs_unusable_other: 0,
        chicken_count: 40,
      },
      database as never,
    );

    await expect(
      createDailyLog(
        {
          date: "2026-04-01",
          eggs_collected_for_sale: 10,
          eggs_used_other_purpose: 0,
          eggs_broken: 0,
          eggs_unusable_other: 0,
          chicken_count: 41,
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(DailyLogDateConflictError);
  });

  it("keeps a single collected row when reconciliation runs more than once", async () => {
    const database = createDailyLogTestDatabase();
    const dailyLog = await createDailyLog(
      {
        date: "2026-04-01",
        eggs_collected_for_sale: 20,
        eggs_used_other_purpose: 1,
        eggs_broken: 0,
        eggs_unusable_other: 0,
        chicken_count: 40,
      },
      database as never,
    );

    await reconcileCollectedInventoryTransaction(database.tx, {
      id: dailyLog.id,
      date: dailyLog.date,
      eggs_collected_for_sale: 22,
    });

    expect(database.inventoryTransactions).toHaveLength(1);
    expect(database.inventoryTransactions[0]).toMatchObject({
      daily_log_id: dailyLog.id,
      type: "collected",
      quantity: 22,
    });
  });

  it("rejects negative values during create flow validation", async () => {
    const database = createDailyLogTestDatabase();

    await expect(
      createDailyLog(
        {
          date: "2026-04-01",
          eggs_collected_for_sale: -1,
          eggs_used_other_purpose: 0,
          eggs_broken: 0,
          eggs_unusable_other: 0,
          chicken_count: 40,
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(DailyLogValidationError);
  });

  it("rejects negative values during update flow validation", async () => {
    const database = createDailyLogTestDatabase();
    const dailyLog = await createDailyLog(
      {
        date: "2026-04-01",
        eggs_collected_for_sale: 20,
        eggs_used_other_purpose: 0,
        eggs_broken: 0,
        eggs_unusable_other: 0,
        chicken_count: 40,
      },
      database as never,
    );

    await expect(
      updateDailyLog(
        dailyLog.id,
        {
          date: "2026-04-01",
          eggs_collected_for_sale: 20,
          eggs_used_other_purpose: 0,
          eggs_broken: 0,
          eggs_unusable_other: 0,
          chicken_count: -1,
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(DailyLogValidationError);
  });

  it("deletes only the collected inventory row owned by the daily log", async () => {
    const database = createDailyLogTestDatabase();
    const dailyLog = await createDailyLog(
      {
        date: "2026-04-01",
        eggs_collected_for_sale: 20,
        eggs_used_other_purpose: 0,
        eggs_broken: 0,
        eggs_unusable_other: 0,
        chicken_count: 40,
      },
      database as never,
    );

    await deleteDailyLog(dailyLog.id, database as never);

    expect(database.lastDeleteManyWhere).toEqual({
      daily_log_id: dailyLog.id,
      type: "collected",
    });
  });
});

function createDailyLogTestDatabase() {
  const dailyLogs: Array<{
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
  }> = [];
  const inventoryTransactions: Array<{
    id: string;
    date: Date;
    type: "collected";
    quantity: number;
    daily_log_id: string | null;
    order_id: string | null;
    note: string | null;
    created_at: Date;
  }> = [];
  let dailyLogSequence = 0;
  let inventorySequence = 0;
  let lastDeleteManyWhere:
    | { daily_log_id?: string; type?: "collected"; id?: { in: string[] } }
    | null = null;

  type DailyLogRow = {
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
  };

  type DailyLogCreateData = Omit<DailyLogRow, "id" | "created_at" | "updated_at">;

  const tx = {
    dailyLog: {
      create: async ({
        data,
      }: {
        data: DailyLogCreateData;
      }) => {
        const duplicate = dailyLogs.find(
          (dailyLog) => dailyLog.date.getTime() === data.date.getTime(),
        );

        if (duplicate) {
          throw { code: "P2002" };
        }

        const now = new Date("2026-04-01T10:00:00.000Z");
        const createdDailyLog = {
          ...data,
          id: `daily_log_${++dailyLogSequence}`,
          created_at: now,
          updated_at: now,
        };

        dailyLogs.push(createdDailyLog);

        return createdDailyLog;
      },
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: { id: true };
      }) => {
        const dailyLog = dailyLogs.find((record) => record.id === where.id) ?? null;

        if (!dailyLog || !select) {
          return dailyLog;
        }

        return { id: dailyLog.id };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<DailyLogCreateData>;
      }) => {
        const index = dailyLogs.findIndex((dailyLog) => dailyLog.id === where.id);

        if (index < 0) {
          throw new Error("Missing daily log.");
        }

        const duplicate = dailyLogs.find(
          (dailyLog) =>
            dailyLog.id !== where.id && dailyLog.date.getTime() === data.date?.getTime(),
        );

        if (duplicate) {
          throw { code: "P2002" };
        }

        dailyLogs[index] = {
          ...dailyLogs[index],
          ...data,
          updated_at: new Date("2026-04-01T11:00:00.000Z"),
        };

        return dailyLogs[index];
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = dailyLogs.findIndex((dailyLog) => dailyLog.id === where.id);

        if (index >= 0) {
          dailyLogs.splice(index, 1);
        }
      },
    },
    $queryRaw: async <T>(query: unknown) => {
      const sql = query as { values?: unknown[] };
      const values = sql.values ?? [];
      const [date, quantity, dailyLogId, note] = values as [
        Date,
        number,
        string,
        string,
      ];
      const existingIndex = inventoryTransactions.findIndex(
        (transaction) => transaction.daily_log_id === dailyLogId,
      );

      if (existingIndex >= 0) {
        inventoryTransactions[existingIndex] = {
          ...inventoryTransactions[existingIndex],
          date,
          quantity,
          note,
        };

        return [inventoryTransactions[existingIndex]] as T;
      }

      const createdTransaction = {
        id: `inventory_${++inventorySequence}`,
        order_id: null,
        created_at: new Date(`2026-04-01T12:00:0${inventorySequence}.000Z`),
        date,
        type: "collected" as const,
        quantity,
        daily_log_id: dailyLogId,
        note,
      };

      inventoryTransactions.push(createdTransaction);

      return [createdTransaction] as T;
    },
    inventoryTransaction: {
      deleteMany: async ({
        where,
      }: {
        where: {
          id?: { in: string[] };
          daily_log_id?: string;
          type?: "collected";
        };
      }) => {
        lastDeleteManyWhere = where;

        if (where.id?.in) {
          const ids = new Set(where.id.in);

          for (let index = inventoryTransactions.length - 1; index >= 0; index -= 1) {
            if (ids.has(inventoryTransactions[index].id)) {
              inventoryTransactions.splice(index, 1);
            }
          }

          return;
        }

        if (where.daily_log_id) {
          for (let index = inventoryTransactions.length - 1; index >= 0; index -= 1) {
            if (inventoryTransactions[index].daily_log_id === where.daily_log_id) {
              inventoryTransactions.splice(index, 1);
            }
          }
        }
      },
    },
  };

  const database = {
    dailyLogs,
    inventoryTransactions,
    get lastDeleteManyWhere() {
      return lastDeleteManyWhere;
    },
    tx,
    transactionCount: 0,
    dailyLog: tx.dailyLog,
    async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>) {
      database.transactionCount += 1;
      return callback(tx);
    },
  };

  return database;
}
