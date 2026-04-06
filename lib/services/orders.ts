import {
  InventoryTransaction,
  Order,
  Prisma,
  PrismaClient,
  price_source,
} from "@prisma/client";
import { getDb } from "@/lib/db";
import { calculateAvailableInventory } from "@/lib/domain/inventory";
import { getDefaultEggUnitPrice, SiteSettingValidationError } from "@/lib/services/site-settings";
import {
  CompletedOrderCorrectionInput,
  EditableOrderInput,
  EditableOrderValidatedInput,
  OrderValidationError,
  validateCompletedOrderCorrectionInput,
  validateEditableOrderInput,
  validateOrderCreateInput,
} from "@/lib/services/order-validation";

const ORDER_RESERVED_NOTE = "Order reserved inventory reconciliation";
const ORDER_RELEASED_NOTE = "Order released inventory reconciliation";
const ORDER_SOLD_NOTE = "Order sold inventory reconciliation";
const SELLABLE_INVENTORY_LOCK_KEY = "jajce_sellable_inventory";

type OrderRecord = Prisma.OrderGetPayload<{
  include: {
    contact: {
      select: {
        id: true;
        full_name: true;
        email: true;
        phone: true;
      };
    };
  };
}>;

type OrderDb = Pick<
  PrismaClient,
  "$transaction" | "contact" | "inventoryTransaction" | "order" | "siteSetting"
>;
type OrderListDb = Pick<PrismaClient, "order">;
type OrderTransactionDb = Parameters<
  Parameters<OrderDb["$transaction"]>[0]
>[0];

type OrderInventoryType = "reserved" | "released" | "sold";

type DesiredOrderInventoryRow = {
  type: OrderInventoryType;
  quantity: number;
  note: string;
  date: Date;
};

export class OrderNotFoundError extends Error {}
export class OrderContactNotFoundError extends Error {}
export class OrderInventoryInsufficientError extends Error {}
export class OrderTransitionNotAllowedError extends Error {}
export class CompletedOrderCorrectionNotAllowedError extends Error {}
export class OrderInventoryStateError extends Error {}
export class OrderInfrastructureError extends Error {}

export type OrderListRecord = OrderRecord;

export async function listOrders(
  database: OrderListDb = getDb(),
): Promise<OrderListRecord[]> {
  return database.order.findMany({
    include: {
      contact: {
        select: {
          id: true,
          full_name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { created_at: "desc" }],
  });
}

export async function createOrder(
  input: EditableOrderInput,
  database: OrderDb = getDb(),
  now = new Date(),
): Promise<Order> {
  const validatedInput = validateOrderCreateInput(input);

  try {
    return await database.$transaction(async (tx) => {
      await acquireSellableInventoryLock(tx);
      await assertContactExists(tx, validatedInput.contact_id);

      const resolvedPricing = await resolveOrderPricing(tx, {
        quantity: validatedInput.quantity,
        price_source: validatedInput.price_source,
        requested_unit_price: validatedInput.unit_price,
      });
      const finalizedOrder = buildCreateOrderData(
        validatedInput,
        resolvedPricing,
        now,
      );
      const desiredInventoryRows = getDesiredInventoryRowsForCreate(
        finalizedOrder.status,
        finalizedOrder.quantity,
        now,
      );

      await assertInventoryAvailableForDesiredRows(tx, {
        orderIdToExclude: null,
        desiredRows: desiredInventoryRows,
      });

      const order = await tx.order.create({
        data: finalizedOrder,
      });

      await reconcileOrderInventoryRows(tx, order.id, desiredInventoryRows);

      return order;
    });
  } catch (error) {
    throw normalizeOrderMutationError(error);
  }
}

export async function updateEditableOrder(
  orderId: string,
  input: EditableOrderInput,
  database: OrderDb = getDb(),
  now = new Date(),
): Promise<Order> {
  const validatedInput = validateEditableOrderInput(input);

  try {
    return await database.$transaction(async (tx) => {
      await acquireSellableInventoryLock(tx);
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          fulfilled_at: true,
        },
      });

      if (!existingOrder) {
        throw new OrderNotFoundError("Order not found.");
      }

      if (existingOrder.status === "completed") {
        throw new CompletedOrderCorrectionNotAllowedError(
          "Completed orders must be changed through the dedicated correction flow.",
        );
      }

      if (existingOrder.status !== "reserved") {
        throw new OrderTransitionNotAllowedError(
          "Only reserved orders can be updated through the normal order flow.",
        );
      }

      const inventoryRows = await getOrderInventoryRows(tx, orderId);
      assertReservedOrderInventoryState(inventoryRows);

      await assertContactExists(tx, validatedInput.contact_id);

      const resolvedPricing = await resolveOrderPricing(tx, {
        quantity: validatedInput.quantity,
        price_source: validatedInput.price_source,
        requested_unit_price: validatedInput.unit_price,
      });
      const desiredRows = getDesiredInventoryRowsForReservedUpdate(
        validatedInput.status,
        validatedInput.quantity,
        now,
      );

      await assertInventoryAvailableForDesiredRows(tx, {
        orderIdToExclude: orderId,
        desiredRows,
      });

      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          contact_id: validatedInput.contact_id,
          date: validatedInput.date,
          target_fulfillment_date: validatedInput.target_fulfillment_date,
          quantity: validatedInput.quantity,
          unit_price: resolvedPricing.unit_price,
          total_price: resolvedPricing.total_price,
          status: validatedInput.status,
          fulfilled_at: getUpdatedReservedOrderFulfilledAt(
            validatedInput,
            existingOrder.fulfilled_at,
            now,
          ),
          price_source: resolvedPricing.price_source,
          note: validatedInput.note,
        },
      });

      await reconcileOrderInventoryRows(tx, orderId, desiredRows);

      return order;
    });
  } catch (error) {
    throw normalizeOrderMutationError(error);
  }
}

export async function correctCompletedOrder(
  orderId: string,
  input: CompletedOrderCorrectionInput,
  database: OrderDb = getDb(),
  now = new Date(),
): Promise<Order> {
  const validatedInput = validateCompletedOrderCorrectionInput(input);

  try {
    return await database.$transaction(async (tx) => {
      await acquireSellableInventoryLock(tx);
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existingOrder) {
        throw new OrderNotFoundError("Order not found.");
      }

      if (existingOrder.status !== "completed") {
        throw new CompletedOrderCorrectionNotAllowedError(
          "Only completed orders can use the completed-order correction flow.",
        );
      }

      const inventoryRows = await getOrderInventoryRows(tx, orderId);
      const inventoryMode = determineCompletedOrderInventoryMode(inventoryRows);
      const defaultUnitPrice = await getDefaultEggUnitPrice(tx);
      const correctedPriceSource = determineCorrectedPriceSource({
        corrected_unit_price: validatedInput.unit_price,
        default_unit_price: defaultUnitPrice,
      });
      const total_price = validatedInput.unit_price.mul(validatedInput.quantity);
      const desiredRows = [
        buildDesiredOrderInventoryRow(inventoryMode, validatedInput.quantity, now),
      ];

      await assertInventoryAvailableForDesiredRows(tx, {
        orderIdToExclude: orderId,
        desiredRows,
      });

      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          quantity: validatedInput.quantity,
          unit_price: validatedInput.unit_price,
          total_price,
          fulfilled_at: validatedInput.fulfilled_at,
          price_source: correctedPriceSource,
          note: validatedInput.note,
        },
      });

      await reconcileOrderInventoryRows(tx, orderId, desiredRows);

      return order;
    });
  } catch (error) {
    throw normalizeOrderMutationError(error);
  }
}

function buildCreateOrderData(
  input: EditableOrderValidatedInput,
  pricing: {
    unit_price: Prisma.Decimal;
    total_price: Prisma.Decimal;
    price_source: price_source;
  },
  now: Date,
): Prisma.OrderUncheckedCreateInput {
  return {
    contact_id: input.contact_id,
    date: input.date,
    target_fulfillment_date: input.target_fulfillment_date,
    quantity: input.quantity,
    unit_price: pricing.unit_price,
    total_price: pricing.total_price,
    status: input.status,
    fulfilled_at:
      input.status === "completed" ? input.fulfilled_at ?? now : null,
    price_source: pricing.price_source,
    note: input.note,
  };
}

function getDesiredInventoryRowsForCreate(
  status: Order["status"],
  quantity: number,
  now: Date,
): DesiredOrderInventoryRow[] {
  if (status === "reserved") {
    return [buildDesiredOrderInventoryRow("reserved", quantity, now)];
  }

  return [buildDesiredOrderInventoryRow("sold", quantity, now)];
}

function getDesiredInventoryRowsForReservedUpdate(
  status: Order["status"],
  quantity: number,
  now: Date,
): DesiredOrderInventoryRow[] {
  if (status === "reserved" || status === "completed") {
    return [buildDesiredOrderInventoryRow("reserved", quantity, now)];
  }

  return [
    buildDesiredOrderInventoryRow("reserved", quantity, now),
    buildDesiredOrderInventoryRow("released", quantity, now),
  ];
}

function buildDesiredOrderInventoryRow(
  type: OrderInventoryType,
  quantity: number,
  now: Date,
): DesiredOrderInventoryRow {
  return {
    type,
    quantity,
    note: getInventoryNote(type),
    date: now,
  };
}

async function resolveOrderPricing(
  database: Pick<OrderTransactionDb, "siteSetting">,
  {
    quantity,
    price_source,
    requested_unit_price,
  }: {
    quantity: number;
    price_source: price_source;
    requested_unit_price: Prisma.Decimal | null;
  },
): Promise<{
  unit_price: Prisma.Decimal;
  total_price: Prisma.Decimal;
  price_source: price_source;
}> {
  const defaultUnitPrice = await getDefaultEggUnitPrice(database);
  const resolvedUnitPrice =
    price_source === "default"
      ? defaultUnitPrice
      : requested_unit_price ??
        (() => {
          throw new OrderValidationError(
            "Manual override price source requires a unit price.",
          );
        })();

  return {
    unit_price: resolvedUnitPrice,
    total_price: resolvedUnitPrice.mul(quantity),
    price_source,
  };
}

function determineCorrectedPriceSource({
  corrected_unit_price,
  default_unit_price,
}: {
  corrected_unit_price: Prisma.Decimal;
  default_unit_price: Prisma.Decimal;
}): price_source {
  return corrected_unit_price.equals(default_unit_price)
    ? "default"
    : "manual_override";
}

function getUpdatedReservedOrderFulfilledAt(
  input: EditableOrderValidatedInput,
  currentFulfilledAt: Date | null,
  now: Date,
): Date | null {
  if (input.status === "reserved" || input.status === "cancelled") {
    return null;
  }

  return input.fulfilled_at ?? currentFulfilledAt ?? now;
}

async function acquireSellableInventoryLock(
  database: Pick<OrderTransactionDb, "$executeRaw">,
): Promise<void> {
  await database.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${SELLABLE_INVENTORY_LOCK_KEY}));`,
  );
}

async function assertContactExists(
  database: Pick<OrderTransactionDb, "contact">,
  contactId: string,
): Promise<void> {
  const contact = await database.contact.findUnique({
    where: { id: contactId },
    select: { id: true },
  });

  if (!contact) {
    throw new OrderContactNotFoundError("Contact not found.");
  }
}

async function assertInventoryAvailableForDesiredRows(
  database: Pick<OrderTransactionDb, "inventoryTransaction">,
  {
    orderIdToExclude,
    desiredRows,
  }: {
    orderIdToExclude: string | null;
    desiredRows: DesiredOrderInventoryRow[];
  },
): Promise<void> {
  const transactions = await database.inventoryTransaction.findMany({
    select: {
      order_id: true,
      type: true,
      quantity: true,
    },
  });
  const availableWithoutCurrentOrder = calculateAvailableInventory(
    transactions
      .filter((transaction) =>
        orderIdToExclude === null
          ? true
          : transaction.order_id !== orderIdToExclude,
      )
      .map((transaction) => ({
        type: transaction.type,
        quantity: transaction.quantity,
      })),
  );
  const desiredInventoryEffect = calculateAvailableInventory(
    desiredRows.map((row) => ({
      type: row.type,
      quantity: row.quantity,
    })),
  );

  if (availableWithoutCurrentOrder + desiredInventoryEffect < 0) {
    throw new OrderInventoryInsufficientError(
      "This order would reduce sellable inventory below zero.",
    );
  }
}

async function reconcileOrderInventoryRows(
  database: Pick<OrderTransactionDb, "inventoryTransaction">,
  orderId: string,
  desiredRows: DesiredOrderInventoryRow[],
): Promise<void> {
  const currentRows = await getOrderInventoryRows(database, orderId);
  const rowsByType = new Map(currentRows.map((row) => [row.type, row]));

  for (const desiredRow of desiredRows) {
    const existingRow = rowsByType.get(desiredRow.type);

    if (existingRow) {
      await database.inventoryTransaction.update({
        where: { id: existingRow.id },
        data: {
          date: desiredRow.date,
          quantity: desiredRow.quantity,
          note: desiredRow.note,
        },
      });
    } else {
      await database.inventoryTransaction.create({
        data: {
          order_id: orderId,
          date: desiredRow.date,
          type: desiredRow.type,
          quantity: desiredRow.quantity,
          note: desiredRow.note,
        },
      });
    }
  }

  const desiredTypes = new Set(desiredRows.map((row) => row.type));
  const obsoleteIds = currentRows
    .filter(
      (row) => isOrderInventoryType(row.type) && !desiredTypes.has(row.type),
    )
    .map((row) => row.id);

  if (obsoleteIds.length > 0) {
    await database.inventoryTransaction.deleteMany({
      where: {
        id: {
          in: obsoleteIds,
        },
      },
    });
  }
}

async function getOrderInventoryRows(
  database: Pick<OrderTransactionDb, "inventoryTransaction">,
  orderId: string,
): Promise<
  Array<
    Pick<
      InventoryTransaction,
      "id" | "type" | "quantity" | "order_id" | "date" | "note"
    >
  >
> {
  const rows = await database.inventoryTransaction.findMany({
    where: {
      order_id: orderId,
    },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  const duplicateTypes = rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.type] = (counts[row.type] ?? 0) + 1;
    return counts;
  }, {});
  const duplicatedTypeCandidate = Object.entries(duplicateTypes).find(
    ([, count]) => count > 1,
  )?.[0];
  const duplicatedType =
    duplicatedTypeCandidate === "reserved" ||
    duplicatedTypeCandidate === "released" ||
    duplicatedTypeCandidate === "sold"
      ? duplicatedTypeCandidate
      : null;

  if (duplicatedType) {
    throw new OrderInventoryStateError(
      `Order inventory state is invalid: multiple ${duplicatedType} rows exist.`,
    );
  }

  return rows;
}

function determineCompletedOrderInventoryMode(
  rows: Array<Pick<InventoryTransaction, "type">>,
): OrderInventoryType {
  const hasReserved = rows.some((row) => row.type === "reserved");
  const hasSold = rows.some((row) => row.type === "sold");
  const hasReleased = rows.some((row) => row.type === "released");

  if (hasReleased) {
    throw new OrderInventoryStateError(
      "Completed orders cannot carry released inventory rows.",
    );
  }

  if (hasReserved === hasSold) {
    throw new OrderInventoryStateError(
      "Completed order inventory must contain exactly one stock-reducing row.",
    );
  }

  return hasReserved ? "reserved" : "sold";
}

function assertReservedOrderInventoryState(
  rows: Array<Pick<InventoryTransaction, "type">>,
): void {
  const hasReserved = rows.some((row) => row.type === "reserved");
  const hasSold = rows.some((row) => row.type === "sold");
  const hasReleased = rows.some((row) => row.type === "released");

  if (!hasReserved || hasSold || hasReleased) {
    throw new OrderInventoryStateError(
      "Reserved order inventory must contain exactly one reserved row and no sold or released rows.",
    );
  }
}

function getInventoryNote(type: OrderInventoryType): string {
  switch (type) {
    case "reserved":
      return ORDER_RESERVED_NOTE;
    case "released":
      return ORDER_RELEASED_NOTE;
    case "sold":
      return ORDER_SOLD_NOTE;
  }
}

function isOrderInventoryType(
  value: InventoryTransaction["type"],
): value is OrderInventoryType {
  return value === "reserved" || value === "released" || value === "sold";
}

function normalizeOrderMutationError(error: unknown): Error {
  if (
    error instanceof OrderValidationError ||
    error instanceof OrderNotFoundError ||
    error instanceof OrderContactNotFoundError ||
    error instanceof OrderInventoryInsufficientError ||
    error instanceof OrderTransitionNotAllowedError ||
    error instanceof CompletedOrderCorrectionNotAllowedError ||
    error instanceof OrderInventoryStateError ||
    error instanceof OrderInfrastructureError ||
    error instanceof SiteSettingValidationError
  ) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2010"
  ) {
    return new OrderInfrastructureError(
      "Order save failed while acquiring the inventory lock.",
    );
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return new OrderInventoryStateError(
      "Order inventory reconciliation hit a duplicate inventory row safeguard.",
    );
  }

  return error instanceof Error ? error : new Error("Unknown order error.");
}
