import {
  CostEntry,
  CostTemplate,
  CostTemplateSkip,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { getDb } from "@/lib/db";
import {
  RecurringCostOccurrence,
  getRecurringCostSuggestionForDate,
} from "@/lib/services/cost-templates";
import {
  CostValidationError,
  assertDateRangeOrder,
  parseBooleanLike,
  parseCostCategory,
  parseCostFrequency,
  parseCostSourceType,
  parseCostType,
  parseOptionalDateOnly,
  parseOptionalNonNegativeDecimal,
  parseOptionalText,
  parseRequiredDateOnly,
  parseRequiredNonNegativeDecimal,
  parseRequiredText,
} from "@/lib/services/cost-validation";

export class CostEntryNotFoundError extends Error {}
export class CostTemplateSuggestionNotFoundError extends Error {}
export class DuplicateAcceptedCostTemplateEntryError extends Error {}
export class TemplateCostEntryMutationNotAllowedError extends Error {}

export type CostEntryRecord = Prisma.CostEntryGetPayload<{
  include: {
    cost_template: true;
  };
}>;

export type CostEntryMutationInput = {
  date: unknown;
  category: unknown;
  cost_type: unknown;
  quantity?: unknown;
  unit?: unknown;
  unit_price?: unknown;
  total_amount: unknown;
  source_type?: unknown;
  cost_template_id?: unknown;
  note?: unknown;
};

export type CostEntryWriteInput = Pick<
  CostEntry,
  | "date"
  | "category"
  | "cost_type"
  | "quantity"
  | "unit"
  | "unit_price"
  | "total_amount"
  | "source_type"
  | "cost_template_id"
  | "note"
>;

export type RecurringTemplateFromCostEntryInput = {
  name: unknown;
  frequency: unknown;
  start_date: unknown;
  end_date?: unknown;
  is_active?: unknown;
};

type CostEntryDb = Pick<
  PrismaClient,
  "$transaction" | "costEntry" | "costTemplate" | "costTemplateSkip"
>;
type CostEntryListDb = Pick<PrismaClient, "costEntry">;

export function validateCostEntryInput(
  input: CostEntryMutationInput,
): CostEntryWriteInput {
  return validateCostEntryInputInternal(input, { allowTemplateSource: false });
}

function validateCostEntryInputInternal(
  input: CostEntryMutationInput,
  { allowTemplateSource }: { allowTemplateSource: boolean },
): CostEntryWriteInput {
  const source_type =
    input.source_type == null
      ? "manual"
      : parseCostSourceType(input.source_type);
  const cost_template_id = parseOptionalIdentifier(input.cost_template_id);

  if (!allowTemplateSource) {
    if (source_type !== "manual") {
      throw new TemplateCostEntryMutationNotAllowedError(
        "Template-origin cost entries can only be created through template acceptance.",
      );
    }

    if (cost_template_id) {
      throw new TemplateCostEntryMutationNotAllowedError(
        "Normal cost entry mutations cannot include a cost template reference.",
      );
    }
  } else {
    if (source_type === "manual" && cost_template_id) {
      throw new CostValidationError(
        "Manual cost entries cannot include a cost template reference.",
      );
    }

    if (source_type === "template" && !cost_template_id) {
      throw new CostValidationError(
        "Template cost entries must include a cost template reference.",
      );
    }
  }

  return {
    date: parseRequiredDateOnly(input.date, "Date"),
    category: parseCostCategory(input.category),
    cost_type: parseCostType(input.cost_type),
    quantity: parseOptionalNonNegativeDecimal(input.quantity, "Quantity"),
    unit: parseOptionalText(input.unit),
    unit_price: parseOptionalNonNegativeDecimal(input.unit_price, "Unit price"),
    total_amount: parseRequiredNonNegativeDecimal(
      input.total_amount,
      "Total amount",
    ),
    source_type,
    cost_template_id,
    note: parseOptionalText(input.note),
  };
}

export async function listCostEntries(
  database: CostEntryListDb = getDb(),
): Promise<CostEntryRecord[]> {
  return database.costEntry.findMany({
    include: {
      cost_template: true,
    },
    orderBy: [{ date: "desc" }, { created_at: "desc" }],
  });
}

export async function createCostEntry(
  input: CostEntryMutationInput,
  database: CostEntryDb = getDb(),
): Promise<CostEntry> {
  const validatedInput = validateCostEntryInput(input);

  try {
    return await database.$transaction((tx) =>
      tx.costEntry.create({
        data: validatedInput,
      }),
    );
  } catch (error) {
    throw normalizeCostEntryMutationError(error);
  }
}

export async function createCostEntryWithRecurringTemplate(
  costEntryInput: CostEntryMutationInput,
  recurringTemplateInput: RecurringTemplateFromCostEntryInput,
  database: CostEntryDb = getDb(),
): Promise<{
  cost_entry: CostEntry;
  cost_template: CostTemplate;
}> {
  const validatedCostEntry = validateCostEntryInput(costEntryInput);
  const validatedRecurringTemplate = validateRecurringTemplateFromCostEntryInput(
    validatedCostEntry,
    recurringTemplateInput,
  );

  try {
    return await database.$transaction(async (tx) => {
      const costEntry = await tx.costEntry.create({
        data: validatedCostEntry,
      });
      const costTemplate = await tx.costTemplate.create({
        data: validatedRecurringTemplate,
      });

      await createOrReuseCostTemplateSkip(
        tx,
        costTemplate.id,
        validatedCostEntry.date,
      );

      return {
        cost_entry: costEntry,
        cost_template: costTemplate,
      };
    });
  } catch (error) {
    throw normalizeCostEntryMutationError(error);
  }
}

export async function updateCostEntry(
  costEntryId: string,
  input: CostEntryMutationInput,
  database: CostEntryDb = getDb(),
): Promise<CostEntry> {
  const validatedInput = validateCostEntryInput(input);

  try {
    return await database.$transaction(async (tx) => {
      const existingEntry = await tx.costEntry.findUnique({
        where: { id: costEntryId },
        select: { id: true, source_type: true },
      });

      if (!existingEntry) {
        throw new CostEntryNotFoundError("Cost entry not found.");
      }

      if (existingEntry.source_type === "template") {
        throw new TemplateCostEntryMutationNotAllowedError(
          "Template-origin cost entries cannot be edited through the normal cost entry flow.",
        );
      }

      return tx.costEntry.update({
        where: { id: costEntryId },
        data: validatedInput,
      });
    });
  } catch (error) {
    throw normalizeCostEntryMutationError(error);
  }
}

export async function deleteCostEntry(
  costEntryId: string,
  database: CostEntryDb = getDb(),
): Promise<void> {
  await database.$transaction(async (tx) => {
    const existingEntry = await tx.costEntry.findUnique({
      where: { id: costEntryId },
      select: { id: true },
    });

    if (!existingEntry) {
      throw new CostEntryNotFoundError("Cost entry not found.");
    }

    await tx.costEntry.delete({
      where: { id: costEntryId },
    });
  });
}

export async function acceptRecurringCostSuggestion(
  costTemplateId: string,
  dateInput: unknown,
  database: CostEntryDb = getDb(),
): Promise<CostEntry> {
  const date = parseRequiredDateOnly(dateInput, "Suggestion date");

  try {
    return await database.$transaction(async (tx) => {
      const suggestion = await getPendingRecurringSuggestionOrThrow(
        tx,
        costTemplateId,
        date,
      );

      return tx.costEntry.create({
        data: buildAcceptedSuggestionCreateInput(suggestion),
      });
    });
  } catch (error) {
    throw normalizeCostEntryMutationError(error);
  }
}

export async function acceptRecurringCostSuggestionWithOverrides(
  costTemplateId: string,
  input: CostEntryMutationInput,
  database: CostEntryDb = getDb(),
): Promise<CostEntry> {
  const suggestionDate = parseRequiredDateOnly(input.date, "Suggestion date");

  try {
    return await database.$transaction(async (tx) => {
      const suggestion = await getPendingRecurringSuggestionOrThrow(
        tx,
        costTemplateId,
        suggestionDate,
      );
      const validatedInput = validateTemplateAcceptedSuggestionInput(
        costTemplateId,
        suggestion.date,
        input,
      );

      return tx.costEntry.create({
        data: validatedInput,
      });
    });
  } catch (error) {
    throw normalizeCostEntryMutationError(error);
  }
}

export async function skipRecurringCostSuggestion(
  costTemplateId: string,
  dateInput: unknown,
  database: CostEntryDb = getDb(),
): Promise<CostTemplateSkip> {
  const date = parseRequiredDateOnly(dateInput, "Suggestion date");

  try {
    return await database.$transaction(async (tx) => {
      const suggestion = await getRecurringCostSuggestionForDate(
        costTemplateId,
        date,
        tx,
      );

      if (!suggestion) {
        throw new CostTemplateSuggestionNotFoundError(
          "No recurring cost suggestion is available for that date.",
        );
      }

      if (suggestion.status === "accepted") {
        throw new DuplicateAcceptedCostTemplateEntryError(
          "That recurring cost has already been accepted for the selected date.",
        );
      }

      const existingSkip = await tx.costTemplateSkip.findUnique({
        where: {
          cost_template_id_date: {
            cost_template_id: costTemplateId,
            date,
          },
        },
      });

      if (existingSkip) {
        return existingSkip;
      }

      return tx.costTemplateSkip.create({
        data: {
          cost_template_id: costTemplateId,
          date,
        },
      });
    });
  } catch (error) {
    throw normalizeCostEntryMutationError(error);
  }
}

async function getPendingRecurringSuggestionOrThrow(
  database: Pick<CostEntryDb, "costEntry" | "costTemplate" | "costTemplateSkip">,
  costTemplateId: string,
  date: Date,
): Promise<RecurringCostOccurrence> {
  const suggestion = await getRecurringCostSuggestionForDate(
    costTemplateId,
    date,
    database,
  );

  if (!suggestion) {
    throw new CostTemplateSuggestionNotFoundError(
      "No recurring cost suggestion is available for that date.",
    );
  }

  if (suggestion.status === "accepted") {
    throw new DuplicateAcceptedCostTemplateEntryError(
      "That recurring cost has already been accepted for the selected date.",
    );
  }

  if (suggestion.status === "skipped") {
    throw new CostTemplateSuggestionNotFoundError(
      "That recurring cost suggestion was already skipped for the selected date.",
    );
  }

  return suggestion;
}

function validateTemplateAcceptedSuggestionInput(
  costTemplateId: string,
  suggestionDate: Date,
  input: CostEntryMutationInput,
): CostEntryWriteInput {
  const validatedInput = validateCostEntryInputInternal(
    {
      ...input,
      date: suggestionDate,
      source_type: "template",
      cost_template_id: costTemplateId,
    },
    { allowTemplateSource: true },
  );

  return {
    ...validatedInput,
    date: suggestionDate,
    source_type: "template",
    cost_template_id: costTemplateId,
  };
}

function validateRecurringTemplateFromCostEntryInput(
  validatedCostEntry: CostEntryWriteInput,
  input: RecurringTemplateFromCostEntryInput,
): Prisma.CostTemplateCreateInput {
  const start_date = parseRequiredDateOnly(input.start_date, "Recurring start date");
  const end_date = parseOptionalDateOnly(input.end_date, "Recurring end date");

  assertDateRangeOrder(start_date, end_date, "Recurring end date");

  return {
    name: parseRequiredText(input.name, "Template name"),
    category: validatedCostEntry.category,
    cost_type: validatedCostEntry.cost_type,
    default_quantity: validatedCostEntry.quantity,
    default_unit: validatedCostEntry.unit,
    default_unit_price: validatedCostEntry.unit_price,
    default_total_amount: validatedCostEntry.total_amount,
    frequency: parseCostFrequency(input.frequency),
    start_date,
    end_date,
    is_active:
      input.is_active === undefined ? true : parseBooleanLike(input.is_active),
    note: validatedCostEntry.note,
  };
}

function buildAcceptedSuggestionCreateInput(
  suggestion: RecurringCostOccurrence,
): Prisma.CostEntryUncheckedCreateInput {
  const template = suggestion.template;

  return {
    date: suggestion.date,
    category: template.category,
    cost_type: template.cost_type,
    quantity: template.default_quantity,
    unit: template.default_unit,
    unit_price: template.default_unit_price,
    total_amount: template.default_total_amount,
    source_type: "template",
    cost_template_id: template.id,
    note: template.note,
  };
}

async function createOrReuseCostTemplateSkip(
  database: Pick<CostEntryDb, "costTemplateSkip">,
  costTemplateId: string,
  date: Date,
): Promise<CostTemplateSkip> {
  const existingSkip = await database.costTemplateSkip.findUnique({
    where: {
      cost_template_id_date: {
        cost_template_id: costTemplateId,
        date,
      },
    },
  });

  if (existingSkip) {
    return existingSkip;
  }

  try {
    return await database.costTemplateSkip.create({
      data: {
        cost_template_id: costTemplateId,
        date,
      },
    });
  } catch (error) {
    if (!isPrismaErrorCode(error, "P2002")) {
      throw error;
    }

    const duplicateSkip = await database.costTemplateSkip.findUnique({
      where: {
        cost_template_id_date: {
          cost_template_id: costTemplateId,
          date,
        },
      },
    });

    if (duplicateSkip) {
      return duplicateSkip;
    }

    throw error;
  }
}

function normalizeCostEntryMutationError(error: unknown): Error {
  if (
    error instanceof CostValidationError ||
    error instanceof CostEntryNotFoundError ||
    error instanceof CostTemplateSuggestionNotFoundError ||
    error instanceof DuplicateAcceptedCostTemplateEntryError ||
    error instanceof TemplateCostEntryMutationNotAllowedError
  ) {
    return error;
  }

  if (isPrismaErrorCode(error, "P2002")) {
    return new DuplicateAcceptedCostTemplateEntryError(
      "A template-based cost entry already exists for that template and date.",
    );
  }

  if (isPrismaErrorCode(error, "P2003")) {
    return new CostValidationError("The selected cost template is invalid.");
  }

  return error instanceof Error ? error : new Error("Unknown cost entry error.");
}

function parseOptionalIdentifier(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isPrismaErrorCode(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
