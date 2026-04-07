import { Prisma, order_status, price_source } from "@prisma/client";
import {
  parseDateOnly,
  parseDateTimeLocalInTimeZone,
} from "@/lib/utils/date";
import { enumValues } from "@/lib/utils/enum-values";

const ADMIN_ORDER_TIME_ZONE =
  process.env.ADMIN_DASHBOARD_TIME_ZONE ?? "Europe/Amsterdam";

export class OrderValidationError extends Error {}

export const ORDER_STATUS_VALUES = enumValues(order_status);
export const PRICE_SOURCE_VALUES = enumValues(price_source);

export type EditableOrderInput = {
  contact_id: unknown;
  date: unknown;
  target_fulfillment_date?: unknown;
  quantity: unknown;
  status: unknown;
  price_source?: unknown;
  unit_price?: unknown;
  fulfilled_at?: unknown;
  note?: unknown;
};

export type EditableOrderValidatedInput = {
  contact_id: string;
  date: Date;
  target_fulfillment_date: Date | null;
  quantity: number;
  status: order_status;
  price_source: price_source;
  unit_price: Prisma.Decimal | null;
  fulfilled_at: Date | null;
  note: string | null;
};

export type CompletedOrderCorrectionInput = {
  quantity: unknown;
  unit_price: unknown;
  fulfilled_at?: unknown;
  note?: unknown;
};

export type CompletedOrderCorrectionValidatedInput = {
  quantity: number;
  unit_price: Prisma.Decimal;
  fulfilled_at: Date | null;
  note: string | null;
};

export function validateOrderCreateInput(
  input: EditableOrderInput,
): EditableOrderValidatedInput {
  const validated = validateEditableOrderInput(input);

  if (validated.status === "cancelled") {
    throw new OrderValidationError(
      "New orders cannot be created directly as cancelled.",
    );
  }

  return validated;
}

export function validateEditableOrderInput(
  input: EditableOrderInput,
): EditableOrderValidatedInput {
  return {
    contact_id: parseIdentifier(input.contact_id, "Contact"),
    date: parseRequiredDateOnly(input.date, "Date"),
    target_fulfillment_date: parseOptionalDateOnly(
      input.target_fulfillment_date,
      "Target fulfillment date",
    ),
    quantity: parsePositiveInteger(input.quantity, "Quantity"),
    status: parseOrderStatus(input.status),
    price_source:
      input.price_source === undefined
        ? "default"
        : parsePriceSource(input.price_source),
    unit_price: parseOptionalNonNegativeDecimal(input.unit_price, "Unit price"),
    fulfilled_at: parseOptionalDateTime(input.fulfilled_at, "Fulfilled at"),
    note: parseOptionalText(input.note),
  };
}

export function validateCompletedOrderCorrectionInput(
  input: CompletedOrderCorrectionInput,
): CompletedOrderCorrectionValidatedInput {
  return {
    quantity: parsePositiveInteger(input.quantity, "Quantity"),
    unit_price: parseRequiredNonNegativeDecimal(input.unit_price, "Unit price"),
    fulfilled_at: parseOptionalDateTime(input.fulfilled_at, "Fulfilled at"),
    note: parseOptionalText(input.note),
  };
}

export function parseOrderStatus(value: unknown): order_status {
  return parseEnumValue(value, ORDER_STATUS_VALUES, "Status");
}

export function parsePriceSource(value: unknown): price_source {
  return parseEnumValue(value, PRICE_SOURCE_VALUES, "Price source");
}

export function parseIdentifier(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new OrderValidationError(`${fieldName} is required.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new OrderValidationError(`${fieldName} is required.`);
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
      throw new OrderValidationError(error.message);
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

export function parseOptionalDateTime(
  value: unknown,
  fieldName: string,
): Date | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(value.getTime());
  }

  try {
    return parseDateTimeLocalInTimeZone(
      value,
      ADMIN_ORDER_TIME_ZONE,
      fieldName,
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new OrderValidationError(error.message);
    }

    throw error;
  }
}

export function parsePositiveInteger(
  value: unknown,
  fieldName: string,
): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsedValue = Number.parseInt(value.trim(), 10);

    if (parsedValue > 0) {
      return parsedValue;
    }
  }

  throw new OrderValidationError(`${fieldName} must be a positive whole number.`);
}

export function parseRequiredNonNegativeDecimal(
  value: unknown,
  fieldName: string,
): Prisma.Decimal {
  const decimal = parseDecimalLike(value, fieldName);

  if (decimal.isNegative()) {
    throw new OrderValidationError(`${fieldName} must be a non-negative amount.`);
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

function parseEnumValue<TValue extends string>(
  value: unknown,
  allowedValues: readonly TValue[],
  fieldName: string,
): TValue {
  if (typeof value !== "string") {
    throw new OrderValidationError(`${fieldName} is required.`);
  }

  const trimmedValue = value.trim();

  if (!allowedValues.includes(trimmedValue as TValue)) {
    throw new OrderValidationError(`${fieldName} is invalid.`);
  }

  return trimmedValue as TValue;
}

function parseDecimalLike(value: unknown, fieldName: string): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new OrderValidationError(`${fieldName} must be a valid amount.`);
    }

    return new Prisma.Decimal(value);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
      throw new OrderValidationError(`${fieldName} must be a valid amount.`);
    }

    return new Prisma.Decimal(trimmedValue);
  }

  throw new OrderValidationError(`${fieldName} must be a valid amount.`);
}
