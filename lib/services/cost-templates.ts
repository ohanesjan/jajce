import {
  CostTemplate,
  Prisma,
  PrismaClient,
  cost_frequency,
} from "@prisma/client";
import { getDb } from "@/lib/db";
import { addUtcDays, formatDateOnly } from "@/lib/utils/date";
import {
  CostValidationError,
  assertDateRangeOrder,
  parseBooleanLike,
  parseCostCategory,
  parseCostFrequency,
  parseCostType,
  parseOptionalDateOnly,
  parseOptionalNonNegativeDecimal,
  parseOptionalText,
  parseRequiredDateOnly,
  parseRequiredNonNegativeDecimal,
  parseRequiredText,
} from "@/lib/services/cost-validation";

export class CostTemplateNotFoundError extends Error {}
export class CostTemplateInUseError extends Error {}

export type CostTemplateMutationInput = {
  name: unknown;
  category: unknown;
  cost_type: unknown;
  default_quantity?: unknown;
  default_unit?: unknown;
  default_unit_price?: unknown;
  default_total_amount: unknown;
  frequency: unknown;
  start_date: unknown;
  end_date?: unknown;
  is_active?: unknown;
  note?: unknown;
};

export type CostTemplateWriteInput = Pick<
  CostTemplate,
  | "name"
  | "category"
  | "cost_type"
  | "default_quantity"
  | "default_unit"
  | "default_unit_price"
  | "default_total_amount"
  | "frequency"
  | "start_date"
  | "end_date"
  | "is_active"
  | "note"
>;

export type CostTemplateListRecord = Prisma.CostTemplateGetPayload<{
  include: {
    _count: {
      select: {
        cost_entries: true;
      };
    };
  };
}>;

export type RecurringCostOccurrenceStatus = "pending" | "accepted" | "skipped";

export type RecurringCostOccurrence = {
  template: CostTemplate;
  date: Date;
  status: RecurringCostOccurrenceStatus;
  accepted_cost_entry_id: string | null;
  skipped_occurrence_id: string | null;
};

type CostTemplateDb = Pick<
  PrismaClient,
  "$transaction" | "costTemplate" | "costEntry"
>;
type CostTemplateListDb = Pick<PrismaClient, "costTemplate">;
type RecurringSuggestionDb = Pick<
  PrismaClient,
  "costTemplate" | "costEntry" | "costTemplateSkip"
>;

export function validateCostTemplateInput(
  input: CostTemplateMutationInput,
): CostTemplateWriteInput {
  const start_date = parseRequiredDateOnly(input.start_date, "Start date");
  const end_date = parseOptionalDateOnly(input.end_date, "End date");

  assertDateRangeOrder(start_date, end_date);

  return {
    name: parseRequiredText(input.name, "Name"),
    category: parseCostCategory(input.category),
    cost_type: parseCostType(input.cost_type),
    default_quantity: parseOptionalNonNegativeDecimal(
      input.default_quantity,
      "Default quantity",
    ),
    default_unit: parseOptionalText(input.default_unit),
    default_unit_price: parseOptionalNonNegativeDecimal(
      input.default_unit_price,
      "Default unit price",
    ),
    default_total_amount: parseRequiredNonNegativeDecimal(
      input.default_total_amount,
      "Default total amount",
    ),
    frequency: parseCostFrequency(input.frequency),
    start_date,
    end_date,
    is_active:
      input.is_active === undefined ? true : parseBooleanLike(input.is_active),
    note: parseOptionalText(input.note),
  };
}

export async function listCostTemplates(
  database: CostTemplateListDb = getDb(),
): Promise<CostTemplateListRecord[]> {
  return database.costTemplate.findMany({
    include: {
      _count: {
        select: {
          cost_entries: true,
        },
      },
    },
    orderBy: [
      { is_active: "desc" },
      { start_date: "desc" },
      { created_at: "desc" },
    ],
  });
}

export async function createCostTemplate(
  input: CostTemplateMutationInput,
  database: CostTemplateDb = getDb(),
): Promise<CostTemplate> {
  const validatedInput = validateCostTemplateInput(input);

  return database.$transaction((tx) =>
    tx.costTemplate.create({
      data: validatedInput,
    }),
  );
}

export async function updateCostTemplate(
  costTemplateId: string,
  input: CostTemplateMutationInput,
  database: CostTemplateDb = getDb(),
): Promise<CostTemplate> {
  const validatedInput = validateCostTemplateInput(input);

  return database.$transaction(async (tx) => {
    const existingTemplate = await tx.costTemplate.findUnique({
      where: { id: costTemplateId },
      select: { id: true },
    });

    if (!existingTemplate) {
      throw new CostTemplateNotFoundError("Cost template not found.");
    }

    return tx.costTemplate.update({
      where: { id: costTemplateId },
      data: validatedInput,
    });
  });
}

export async function setCostTemplateActiveState(
  costTemplateId: string,
  isActive: boolean,
  database: CostTemplateDb = getDb(),
): Promise<CostTemplate> {
  return database.$transaction(async (tx) => {
    const existingTemplate = await tx.costTemplate.findUnique({
      where: { id: costTemplateId },
      select: { id: true },
    });

    if (!existingTemplate) {
      throw new CostTemplateNotFoundError("Cost template not found.");
    }

    return tx.costTemplate.update({
      where: { id: costTemplateId },
      data: {
        is_active: isActive,
      },
    });
  });
}

export async function deleteCostTemplate(
  costTemplateId: string,
  database: CostTemplateDb = getDb(),
): Promise<void> {
  await database.$transaction(async (tx) => {
    const existingTemplate = await tx.costTemplate.findUnique({
      where: { id: costTemplateId },
      select: { id: true },
    });

    if (!existingTemplate) {
      throw new CostTemplateNotFoundError("Cost template not found.");
    }

    const referencedCostEntry = await tx.costEntry.findFirst({
      where: {
        cost_template_id: costTemplateId,
      },
      select: {
        id: true,
      },
    });

    if (referencedCostEntry) {
      throw new CostTemplateInUseError(
        "This cost template is already referenced by booked cost entries.",
      );
    }

    await tx.costTemplate.delete({
      where: { id: costTemplateId },
    });
  });
}

export async function listRecurringCostSuggestionsForDate(
  dateInput: unknown,
  database: RecurringSuggestionDb = getDb(),
): Promise<RecurringCostOccurrence[]> {
  const date = parseRequiredDateOnly(dateInput, "Suggestion date");

  return listRecurringCostOccurrencesInRange(
    {
      startDate: date,
      endDate: date,
      statuses: ["pending"],
    },
    database,
  );
}

export async function listRecurringCostOccurrencesInRange(
  {
    startDate,
    endDate,
    statuses,
  }: {
    startDate: unknown;
    endDate: unknown;
    statuses?: readonly RecurringCostOccurrenceStatus[];
  },
  database: RecurringSuggestionDb = getDb(),
): Promise<RecurringCostOccurrence[]> {
  const parsedStartDate = parseRequiredDateOnly(startDate, "Start date");
  const parsedEndDate = parseRequiredDateOnly(endDate, "End date");

  assertDateRangeOrder(parsedStartDate, parsedEndDate);

  const matchingTemplates = await database.costTemplate.findMany({
    where: {
      is_active: true,
      start_date: { lte: parsedEndDate },
      OR: [{ end_date: null }, { end_date: { gte: parsedStartDate } }],
    },
    orderBy: [{ name: "asc" }, { created_at: "asc" }],
  });

  if (matchingTemplates.length === 0) {
    return [];
  }

  const templateIds = matchingTemplates.map((template) => template.id);
  const [acceptedEntries, skippedOccurrences] = await Promise.all([
    database.costEntry.findMany({
      where: {
        date: {
          gte: parsedStartDate,
          lte: parsedEndDate,
        },
        source_type: "template",
        cost_template_id: {
          in: templateIds,
        },
      },
      select: {
        id: true,
        cost_template_id: true,
        date: true,
      },
    }),
    database.costTemplateSkip.findMany({
      where: {
        date: {
          gte: parsedStartDate,
          lte: parsedEndDate,
        },
        cost_template_id: {
          in: templateIds,
        },
      },
      select: {
        id: true,
        cost_template_id: true,
        date: true,
      },
    }),
  ]);

  const acceptedOccurrenceIdsByKey = new Map(
    acceptedEntries
      .filter(
        (
          entry,
        ): entry is typeof entry & {
          cost_template_id: string;
        } => entry.cost_template_id !== null,
      )
      .map((entry) => [
        buildOccurrenceKey(entry.cost_template_id, entry.date),
        entry.id,
      ]),
  );
  const skippedOccurrenceIdsByKey = new Map(
    skippedOccurrences.map((skip) => [
      buildOccurrenceKey(skip.cost_template_id, skip.date),
      skip.id,
    ]),
  );
  const allowedStatuses = statuses ? new Set(statuses) : null;
  const occurrences: RecurringCostOccurrence[] = [];

  for (const template of matchingTemplates) {
    for (const occurrenceDate of getTemplateOccurrenceDatesInRange(
      template,
      parsedStartDate,
      parsedEndDate,
    )) {
      const occurrenceKey = buildOccurrenceKey(template.id, occurrenceDate);
      const acceptedCostEntryId =
        acceptedOccurrenceIdsByKey.get(occurrenceKey) ?? null;
      const skippedOccurrenceId =
        skippedOccurrenceIdsByKey.get(occurrenceKey) ?? null;
      const status: RecurringCostOccurrenceStatus = acceptedCostEntryId
        ? "accepted"
        : skippedOccurrenceId
          ? "skipped"
          : "pending";

      if (allowedStatuses && !allowedStatuses.has(status)) {
        continue;
      }

      occurrences.push({
        template,
        date: occurrenceDate,
        status,
        accepted_cost_entry_id: acceptedCostEntryId,
        skipped_occurrence_id: skippedOccurrenceId,
      });
    }
  }

  return occurrences.sort(
    (left, right) =>
      left.date.getTime() - right.date.getTime() ||
      left.template.name.localeCompare(right.template.name),
  );
}

export async function getRecurringCostSuggestionForDate(
  costTemplateId: string,
  dateInput: unknown,
  database: RecurringSuggestionDb = getDb(),
): Promise<RecurringCostOccurrence | null> {
  const date = parseRequiredDateOnly(dateInput, "Suggestion date");
  const suggestions = await listRecurringCostOccurrencesInRange(
    {
      startDate: date,
      endDate: date,
    },
    database,
  );

  return (
    suggestions.find((suggestion) => suggestion.template.id === costTemplateId) ??
    null
  );
}

export function doesCostTemplateApplyOnDate(
  template: Pick<
    CostTemplate,
    "frequency" | "start_date" | "end_date" | "is_active"
  >,
  date: Date,
): boolean {
  if (!template.is_active) {
    return false;
  }

  if (date.getTime() < template.start_date.getTime()) {
    return false;
  }

  if (template.end_date && date.getTime() > template.end_date.getTime()) {
    return false;
  }

  switch (template.frequency) {
    case cost_frequency.daily:
      return true;
    case cost_frequency.weekly:
      return getUtcDayDifference(template.start_date, date) % 7 === 0;
    case cost_frequency.monthly:
      return doesMonthlyTemplateApplyOnDate(template.start_date, date);
    default:
      return assertNever(template.frequency);
  }
}

export function describeTemplateSchedule(
  template: Pick<CostTemplate, "frequency" | "start_date" | "end_date">,
): string {
  const endDateLabel = template.end_date
    ? ` until ${formatDateOnly(template.end_date)}`
    : "";

  return `${template.frequency} from ${formatDateOnly(template.start_date)}${endDateLabel}`;
}

function getTemplateOccurrenceDatesInRange(
  template: Pick<
    CostTemplate,
    "id" | "frequency" | "start_date" | "end_date" | "is_active"
  >,
  startDate: Date,
  endDate: Date,
): Date[] {
  const occurrenceStartDate =
    template.start_date.getTime() > startDate.getTime()
      ? template.start_date
      : startDate;
  const occurrenceEndDate =
    template.end_date && template.end_date.getTime() < endDate.getTime()
      ? template.end_date
      : endDate;
  const dates: Date[] = [];

  for (
    let currentDate = occurrenceStartDate;
    currentDate.getTime() <= occurrenceEndDate.getTime();
    currentDate = addUtcDays(currentDate, 1)
  ) {
    if (doesCostTemplateApplyOnDate(template, currentDate)) {
      dates.push(currentDate);
    }
  }

  return dates;
}

function buildOccurrenceKey(costTemplateId: string, date: Date): string {
  return `${costTemplateId}:${formatDateOnly(date)}`;
}

function getUtcDayDifference(startDate: Date, endDate: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay);
}

function doesMonthlyTemplateApplyOnDate(startDate: Date, date: Date): boolean {
  if (startDate.getUTCDate() !== date.getUTCDate()) {
    return false;
  }

  const monthDifference =
    (date.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (date.getUTCMonth() - startDate.getUTCMonth());

  return monthDifference >= 0;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected template frequency: ${String(value)}`);
}
