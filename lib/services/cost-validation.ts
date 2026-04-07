import {
  Prisma,
  cost_category,
  cost_frequency,
  cost_source_type,
  cost_type,
} from "@prisma/client";
import { parseDateOnly } from "@/lib/utils/date";
import { enumValues } from "@/lib/utils/enum-values";

export class CostValidationError extends Error {}

export const COST_CATEGORY_VALUES = enumValues(cost_category);
export const COST_TYPE_VALUES = enumValues(cost_type);
export const COST_FREQUENCY_VALUES = enumValues(cost_frequency);
export const COST_SOURCE_TYPE_VALUES = enumValues(cost_source_type);

export function parseCostCategory(value: unknown): cost_category {
  return parseEnumValue(value, COST_CATEGORY_VALUES, "Category");
}

export function parseCostType(value: unknown): cost_type {
  return parseEnumValue(value, COST_TYPE_VALUES, "Cost type");
}

export function parseCostFrequency(value: unknown): cost_frequency {
  return parseEnumValue(value, COST_FREQUENCY_VALUES, "Frequency");
}

export function parseCostSourceType(value: unknown): cost_source_type {
  return parseEnumValue(value, COST_SOURCE_TYPE_VALUES, "Source type");
}

export function parseRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new CostValidationError(`${fieldName} is required.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new CostValidationError(`${fieldName} is required.`);
  }

  return trimmedValue;
}

export function parseOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function parseRequiredDateOnly(value: unknown, fieldName: string): Date {
  try {
    return parseDateOnly(value, fieldName);
  } catch (error) {
    if (error instanceof Error) {
      throw new CostValidationError(error.message);
    }

    throw error;
  }
}

export function parseOptionalDateOnly(
  value: unknown,
  fieldName: string,
): Date | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }

  return parseRequiredDateOnly(value, fieldName);
}

export function parseBooleanLike(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["true", "1", "on", "yes"].includes(normalizedValue)) {
      return true;
    }

    if (["false", "0", "off", "no", ""].includes(normalizedValue)) {
      return false;
    }
  }

  if (value == null) {
    return false;
  }

  throw new CostValidationError("Active status must be a valid boolean value.");
}

export function parseRequiredNonNegativeDecimal(
  value: unknown,
  fieldName: string,
): Prisma.Decimal {
  const decimal = parseDecimalLike(value, fieldName);

  if (decimal.isNegative()) {
    throw new CostValidationError(`${fieldName} must be a non-negative amount.`);
  }

  return decimal;
}

export function parseOptionalNonNegativeDecimal(
  value: unknown,
  fieldName: string,
): Prisma.Decimal | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }

  return parseRequiredNonNegativeDecimal(value, fieldName);
}

export function assertDateRangeOrder(
  startDate: Date,
  endDate: Date | null,
  fieldName = "End date",
): void {
  if (endDate && endDate.getTime() < startDate.getTime()) {
    throw new CostValidationError(
      `${fieldName} must be on or after the start date.`,
    );
  }
}

function parseEnumValue<TValue extends string>(
  value: unknown,
  allowedValues: readonly TValue[],
  fieldName: string,
): TValue {
  if (typeof value !== "string") {
    throw new CostValidationError(`${fieldName} is required.`);
  }

  const trimmedValue = value.trim();

  if (!allowedValues.includes(trimmedValue as TValue)) {
    throw new CostValidationError(`${fieldName} is invalid.`);
  }

  return trimmedValue as TValue;
}

function parseDecimalLike(value: unknown, fieldName: string): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CostValidationError(`${fieldName} must be a valid amount.`);
    }

    return new Prisma.Decimal(value);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
      throw new CostValidationError(`${fieldName} must be a valid amount.`);
    }

    return new Prisma.Decimal(trimmedValue);
  }

  throw new CostValidationError(`${fieldName} must be a valid amount.`);
}
