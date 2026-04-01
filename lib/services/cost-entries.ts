import {
  CostEntry,
  CostTemplate,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { getDb } from "@/lib/db";
import {
  RecurringCostSuggestion,
  getRecurringCostSuggestionForDate,
} from "@/lib/services/cost-templates";
import {
  CostValidationError,
  parseCostCategory,
  parseCostSourceType,
  parseCostType,
  parseOptionalNonNegativeDecimal,
  parseOptionalText,
  parseRequiredDateOnly,
  parseRequiredNonNegativeDecimal,
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

type CostEntryDb = Pick<PrismaClient, "$transaction" | "costEntry" | "costTemplate">;
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
    input.source_type === undefined
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

      if (suggestion.already_accepted) {
        throw new DuplicateAcceptedCostTemplateEntryError(
          "That recurring cost has already been accepted for the selected date.",
        );
      }

      return tx.costEntry.create({
        data: buildAcceptedSuggestionCreateInput(suggestion),
      });
    });
  } catch (error) {
    throw normalizeCostEntryMutationError(error);
  }
}

function buildAcceptedSuggestionCreateInput(
  suggestion: RecurringCostSuggestion,
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
