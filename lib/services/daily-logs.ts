import {
  DailyLog,
  InventoryTransaction,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { getDb } from "@/lib/db";
import { calculateEggsTotalYield } from "@/lib/domain/daily-log";
import { formatDateOnly, parseDateOnly } from "@/lib/utils/date";

const COLLECTED_INVENTORY_NOTE = "Daily log collected inventory reconciliation";

export class DailyLogValidationError extends Error {}
export class DailyLogDateConflictError extends Error {}
export class DailyLogNotFoundError extends Error {}

export type DailyLogMutationInput = {
  date: unknown;
  eggs_total_yield?: unknown;
  eggs_collected_for_sale: unknown;
  eggs_used_other_purpose: unknown;
  eggs_broken: unknown;
  eggs_unusable_other: unknown;
  chicken_count: unknown;
  public_note?: unknown;
  notes?: unknown;
};

export type DailyLogWriteInput = Pick<
  DailyLog,
  | "date"
  | "eggs_total_yield"
  | "eggs_collected_for_sale"
  | "eggs_used_other_purpose"
  | "eggs_broken"
  | "eggs_unusable_other"
  | "chicken_count"
  | "public_note"
  | "notes"
>;

type DailyLogDb = Pick<PrismaClient, "$transaction" | "dailyLog">;
type DailyLogListDb = Pick<PrismaClient, "dailyLog">;
type InventoryTransactionReconciliationDelegate = {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
};

export function validateDailyLogInput(
  input: DailyLogMutationInput,
): DailyLogWriteInput {
  const eggs_collected_for_sale = parseNonNegativeInteger(
    input.eggs_collected_for_sale,
    "Eggs collected for sale",
  );
  const eggs_used_other_purpose = parseNonNegativeInteger(
    input.eggs_used_other_purpose,
    "Eggs used other purpose",
  );
  const eggs_broken = parseNonNegativeInteger(input.eggs_broken, "Eggs broken");
  const eggs_unusable_other = parseNonNegativeInteger(
    input.eggs_unusable_other,
    "Eggs unusable other",
  );
  const chicken_count = parseNonNegativeInteger(
    input.chicken_count,
    "Chicken count",
  );

  return {
    date: parseDateOnly(input.date, "Date"),
    eggs_total_yield: calculateEggsTotalYield({
      eggs_collected_for_sale,
      eggs_used_other_purpose,
      eggs_broken,
      eggs_unusable_other,
    }),
    eggs_collected_for_sale,
    eggs_used_other_purpose,
    eggs_broken,
    eggs_unusable_other,
    chicken_count,
    public_note: parseOptionalText(input.public_note),
    notes: parseOptionalText(input.notes),
  };
}

export async function listDailyLogs(
  database: DailyLogListDb = getDb(),
): Promise<DailyLog[]> {
  return database.dailyLog.findMany({
    orderBy: [{ date: "desc" }, { created_at: "desc" }],
  });
}

export async function createDailyLog(
  input: DailyLogMutationInput,
  database: DailyLogDb = getDb(),
): Promise<DailyLog> {
  const validatedInput = validateDailyLogInput(input);

  try {
    return await database.$transaction(async (tx) => {
      const dailyLog = await tx.dailyLog.create({
        data: validatedInput,
      });

      await reconcileCollectedInventoryTransaction(tx, dailyLog);

      return dailyLog;
    });
  } catch (error) {
    throw normalizeDailyLogMutationError(error);
  }
}

export async function updateDailyLog(
  dailyLogId: string,
  input: DailyLogMutationInput,
  database: DailyLogDb = getDb(),
): Promise<DailyLog> {
  const validatedInput = validateDailyLogInput(input);

  try {
    return await database.$transaction(async (tx) => {
      const existingDailyLog = await tx.dailyLog.findUnique({
        where: { id: dailyLogId },
        select: { id: true },
      });

      if (!existingDailyLog) {
        throw new DailyLogNotFoundError("Daily log not found.");
      }

      const dailyLog = await tx.dailyLog.update({
        where: { id: dailyLogId },
        data: validatedInput,
      });

      await reconcileCollectedInventoryTransaction(tx, dailyLog);

      return dailyLog;
    });
  } catch (error) {
    throw normalizeDailyLogMutationError(error);
  }
}

export async function deleteDailyLog(
  dailyLogId: string,
  database: DailyLogDb = getDb(),
): Promise<void> {
  try {
    await database.$transaction(async (tx) => {
      const existingDailyLog = await tx.dailyLog.findUnique({
        where: { id: dailyLogId },
        select: { id: true },
      });

      if (!existingDailyLog) {
        throw new DailyLogNotFoundError("Daily log not found.");
      }

      await tx.inventoryTransaction.deleteMany({
        where: {
          daily_log_id: dailyLogId,
          type: "collected",
        },
      });

      await tx.dailyLog.delete({
        where: { id: dailyLogId },
      });
    });
  } catch (error) {
    throw normalizeDailyLogMutationError(error);
  }
}

export async function reconcileCollectedInventoryTransaction(
  transaction: InventoryTransactionReconciliationDelegate,
  dailyLog: Pick<DailyLog, "id" | "date" | "eggs_collected_for_sale">,
): Promise<InventoryTransaction> {
  const inventoryDate = parseDateOnly(formatDateOnly(dailyLog.date));
  const reconciledTransactions = await transaction.$queryRaw<
    InventoryTransaction[]
  >(Prisma.sql`
    INSERT INTO "inventory_transactions" (
      "date",
      "type",
      "quantity",
      "daily_log_id",
      "note"
    )
    VALUES (
      ${inventoryDate},
      'collected'::"inventory_transaction_type",
      ${dailyLog.eggs_collected_for_sale},
      ${dailyLog.id},
      ${COLLECTED_INVENTORY_NOTE}
    )
    ON CONFLICT ("daily_log_id")
    WHERE "type" = 'collected' AND "daily_log_id" IS NOT NULL
    DO UPDATE SET
      "date" = EXCLUDED."date",
      "quantity" = EXCLUDED."quantity",
      "note" = EXCLUDED."note"
    RETURNING *;
  `);
  const reconciledTransaction = reconciledTransactions[0];

  if (!reconciledTransaction) {
    throw new Error("Collected inventory reconciliation did not return a row.");
  }

  return reconciledTransaction;
}

function parseNonNegativeInteger(value: unknown, fieldName: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  throw new DailyLogValidationError(
    `${fieldName} must be a non-negative whole number.`,
  );
}

function parseOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeDailyLogMutationError(error: unknown): Error {
  if (
    error instanceof DailyLogValidationError ||
    error instanceof DailyLogDateConflictError ||
    error instanceof DailyLogNotFoundError
  ) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return new DailyLogDateConflictError(
      "A daily log already exists for this date.",
    );
  }

  return error instanceof Error ? error : new Error("Daily log update failed.");
}
